package com.university.helpdesk.controller;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tickets")
@CrossOrigin(origins = "*")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TicketCommentRepository commentRepository;
    private final NotificationService notificationService;

    public TicketController(TicketRepository ticketRepository,
                            UserRepository userRepository,
                            CategoryRepository categoryRepository,
                            TicketCommentRepository commentRepository,
                            NotificationService notificationService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
    }

    private boolean isStaffUser(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SUPPORT_AGENT") ||
                a.getAuthority().equals("ROLE_DEPARTMENT_MANAGER") ||
                a.getAuthority().equals("ROLE_ADMIN") ||
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
    }

    // ─── GET ALL (Restricted to Staff, Managers, Admins) ──────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public List<Ticket> getAllTickets() {
        return ticketRepository.findAll();
    }

    // ─── GET MY TICKETS (End-Users: Student, Lecturer + Staff) ───────────────
    @GetMapping("/my-tickets")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Ticket>> getMyTickets(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(ticketRepository.findByCreatedById(user.getId()));
    }

    // ─── GET BY ID (Enforces Ownership for End-Users) ─────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (!isStaffUser(auth)) {
            if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getUsername().equals(auth.getName())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only view your own tickets");
            }
        }

        return ResponseEntity.ok(ticket);
    }

    // ─── CREATE TICKET ───────────────────────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> createTicket(@RequestBody Ticket ticket, Authentication auth) {
        User currentUser = null;
        if (auth != null && auth.isAuthenticated()) {
            currentUser = userRepository.findByUsername(auth.getName()).orElse(null);
        }

        if (!isStaffUser(auth) && currentUser != null) {
            // End-users must be the creator of their submitted tickets
            ticket.setCreatedBy(currentUser);
        } else if (ticket.getCreatedBy() != null && ticket.getCreatedBy().getId() != null) {
            User user = userRepository.findById(ticket.getCreatedBy().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "User not found"));
            ticket.setCreatedBy(user);
        } else if (currentUser != null) {
            ticket.setCreatedBy(currentUser);
        } else {
            User defaultUser = userRepository.findAll().stream().findFirst()
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "No default user available"));
            ticket.setCreatedBy(defaultUser);
        }

        if (ticket.getCategory() != null && ticket.getCategory().getId() != null) {
            Category category = categoryRepository.findById(ticket.getCategory().getId()).orElse(null);
            ticket.setCategory(category);
        }

        Ticket savedTicket = ticketRepository.save(ticket);

        // Auto notification hook
        try {
            notificationService.notifyTicketCreated(savedTicket);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedTicket);
    }

    // ─── EDIT TICKET (Creator only, while status is OPEN) ────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        // IDOR check: must be ticket creator (or Admin)
        if (!isAdmin && (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only edit your own tickets");
        }

        // Status check: must be OPEN
        if (ticket.getStatus() != Status.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot edit ticket once processing has begun");
        }

        if (body.containsKey("title") && body.get("title") != null) {
            String title = body.get("title").toString().trim();
            if (!title.isEmpty()) ticket.setTitle(title);
        }
        if (body.containsKey("description") && body.get("description") != null) {
            String desc = body.get("description").toString().trim();
            if (!desc.isEmpty()) ticket.setDescription(desc);
        }
        if (body.containsKey("priority") && body.get("priority") != null) {
            try {
                ticket.setPriority(Priority.valueOf(body.get("priority").toString().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (body.containsKey("location") && body.get("location") != null) {
            ticket.setLocation(body.get("location").toString().trim());
        }
        if (body.containsKey("department") && body.get("department") != null) {
            ticket.setDepartment(body.get("department").toString().trim());
        }
        if (body.containsKey("categoryId") && body.get("categoryId") != null) {
            Long catId = Long.valueOf(body.get("categoryId").toString());
            categoryRepository.findById(catId).ifPresent(ticket::setCategory);
        }

        Ticket saved = ticketRepository.save(ticket);
        return ResponseEntity.ok(saved);
    }

    // ─── CANCEL / DELETE TICKET (Creator soft-cancels if OPEN, Admin hard-deletes) ──
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> deleteOrCancelTicket(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        if (isAdmin) {
            ticketRepository.deleteById(id);
            return ResponseEntity.noContent().build();
        }

        // Creator soft-cancellation
        if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only cancel your own tickets");
        }

        if (ticket.getStatus() != Status.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot cancel ticket once processing has begun");
        }

        ticket.setStatus(Status.CANCELLED);
        Ticket saved = ticketRepository.save(ticket);
        return ResponseEntity.ok(saved);
    }

    // ─── CONFIRM RESOLUTION (Ticket Creator confirms resolution -> CLOSED) ───
    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> confirmResolution(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        // IDOR check: must be ticket creator or Admin
        if (!isAdmin && (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Only the ticket creator can confirm resolution");
        }

        if (ticket.getStatus() != Status.RESOLVED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only RESOLVED tickets can be confirmed as closed");
        }

        ticket.setStatus(Status.CLOSED);
        Ticket updated = ticketRepository.save(ticket);

        try {
            notificationService.notifyStatusUpdated(updated, Status.RESOLVED, Status.CLOSED);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.ok(updated);
    }

    // ─── REOPEN TICKET (Ticket Creator reopens -> REOPENED with reason) ───────
    @PutMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> reopenTicket(@PathVariable Long id,
                                               @RequestBody(required = false) Map<String, String> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_ADMIN") || a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        // IDOR check: must be ticket creator or Admin
        if (!isAdmin && (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Only the ticket creator can reopen this ticket");
        }

        if (ticket.getStatus() != Status.RESOLVED && ticket.getStatus() != Status.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only RESOLVED or CLOSED tickets can be reopened");
        }

        Status oldStatus = ticket.getStatus();
        ticket.setStatus(Status.REOPENED);
        ticket.setResolvedAt(null);

        // Add reason as comment if provided
        String reason = body != null ? body.get("reason") : null;
        if (reason != null && !reason.isBlank()) {
            TicketComment comment = new TicketComment();
            comment.setTicket(ticket);
            comment.setAuthor(currentUser);
            comment.setContent("Ticket Reopened: " + reason.trim());
            comment.setInternal(false);
            commentRepository.save(comment);
        }

        Ticket updated = ticketRepository.save(ticket);

        try {
            notificationService.notifyStatusUpdated(updated, oldStatus, Status.REOPENED);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.ok(updated);
    }

    // ─── UPDATE STATUS (Agents, Managers, Admins) ─────────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id,
                                               @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        String statusStr = body.get("status");
        if (statusStr == null || statusStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "status field is required");
        }

        Status newStatus;
        try {
            newStatus = Status.valueOf(statusStr.toUpperCase());
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + statusStr);
        }

        Status oldStatus = ticket.getStatus();
        ticket.setStatus(newStatus);

        // Auto-set resolvedAt when resolving
        if (newStatus == Status.RESOLVED && ticket.getResolvedAt() == null) {
            ticket.setResolvedAt(LocalDateTime.now());
        } else if (newStatus == Status.OPEN || newStatus == Status.REOPENED) {
            ticket.setResolvedAt(null);
        }

        // Set resolution notes if provided
        String notes = body.get("resolutionNotes");
        if (notes != null && !notes.isBlank()) {
            ticket.setResolutionNotes(notes);
        }

        Ticket updated = ticketRepository.save(ticket);

        // Auto notification hook
        if (oldStatus != newStatus) {
            try {
                notificationService.notifyStatusUpdated(updated, oldStatus, newStatus);
            } catch (Exception e) {
                System.err.println("Notification trigger failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(updated);
    }

    // ─── ASSIGN AGENT (Agents self-assign, Managers/Admins assign any) ─────────
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> assignTicket(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        Object agentIdObj = body.get("agentId");
        User assignedAgent = null;
        if (agentIdObj == null) {
            ticket.setAssignedTo(null);
        } else {
            Long agentId = Long.valueOf(agentIdObj.toString());
            assignedAgent = userRepository.findById(agentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));

            // Support agents can only assign to themselves; Managers and Admins can re-assign to anyone
            boolean isManagerOrAdmin = auth.getAuthorities().stream().anyMatch(a ->
                    a.getAuthority().equals("ROLE_DEPARTMENT_MANAGER") ||
                    a.getAuthority().equals("ROLE_ADMIN") ||
                    a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

            if (!isManagerOrAdmin) {
                User currentUser = userRepository.findByUsername(auth.getName()).orElse(null);
                if (currentUser == null || !currentUser.getId().equals(agentId)) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Support agents can only assign tickets to themselves");
                }
            }

            ticket.setAssignedTo(assignedAgent);

            if (ticket.getStatus() == Status.OPEN) {
                ticket.setStatus(Status.IN_PROGRESS);
            }
        }

        Ticket updated = ticketRepository.save(ticket);

        if (assignedAgent != null) {
            try {
                notificationService.notifyTicketAssigned(updated, assignedAgent);
            } catch (Exception e) {
                System.err.println("Notification trigger failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(updated);
    }

    // ─── POST COMMENT (Forces isInternal=false for End-Users) ─────────────────
    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<TicketComment> addComment(@PathVariable Long id,
                                                    @RequestBody Map<String, Object> body,
                                                    Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        String content = (String) body.get("content");
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }

        User author;
        if (auth != null && auth.isAuthenticated()) {
            author = userRepository.findByUsername(auth.getName())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        } else {
            Object authorIdObj = body.get("authorId");
            if (authorIdObj == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "authorId is required");
            }
            Long authorId = Long.valueOf(authorIdObj.toString());
            author = userRepository.findById(authorId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Author user not found"));
        }

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthor(author);
        comment.setContent(content);

        // Internal note validation: ONLY staff can mark comment as internal
        boolean isStaff = isStaffUser(auth);
        Object isInternalObj = body.get("isInternal");
        if (isStaff && isInternalObj != null) {
            comment.setInternal(Boolean.parseBoolean(isInternalObj.toString()));
        } else {
            comment.setInternal(false);
        }

        TicketComment saved = commentRepository.save(comment);

        try {
            notificationService.notifyNewComment(ticket, saved);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ─── GET COMMENTS (Hides Internal Notes from End-Users) ───────────────────
    @GetMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<TicketComment>> getComments(@PathVariable Long id, Authentication auth) {
        if (!ticketRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }

        boolean isStaff = isStaffUser(auth);
        List<TicketComment> comments = isStaff
                ? commentRepository.findByTicketIdOrderByCreatedAtAsc(id)
                : commentRepository.findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(id);

        return ResponseEntity.ok(comments);
    }
}
