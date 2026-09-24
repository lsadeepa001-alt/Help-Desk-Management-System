package com.university.helpdesk.controller;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.NotificationService;
import com.university.helpdesk.service.TicketDeletionService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/tickets")
@CrossOrigin(origins = "*")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TicketCommentRepository commentRepository;
    private final NotificationService notificationService;
    private final TicketDeletionService ticketDeletionService;

    private static final Set<String> TECHNICAL_DEPARTMENTS = Set.of("IT", "MAINTENANCE", "SECURITY");

    public TicketController(TicketRepository ticketRepository,
                            UserRepository userRepository,
                            CategoryRepository categoryRepository,
                            TicketCommentRepository commentRepository,
                            NotificationService notificationService,
                            TicketDeletionService ticketDeletionService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
        this.ticketDeletionService = ticketDeletionService;
    }

    private boolean isStaffUser(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SUPPORT_AGENT") ||
                a.getAuthority().equals("ROLE_TEAM_LEAD") ||
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
    }

    private boolean hasRole(Authentication auth, String role) {
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_" + role));
    }

    private User getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private boolean isCreator(Ticket ticket, User user) {
        return ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(user.getId());
    }

    private String normalizeTechnicalDepartment(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Technical department is required");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!TECHNICAL_DEPARTMENTS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid technical department. Allowed values: IT, Maintenance, Security");
        }
        return switch (normalized) {
            case "IT" -> "IT";
            case "MAINTENANCE" -> "Maintenance";
            case "SECURITY" -> "Security";
            default -> throw new IllegalStateException("Unexpected department: " + normalized);
        };
    }

    private boolean sameDepartment(String first, String second) {
        return first != null && second != null && first.trim().equalsIgnoreCase(second.trim());
    }

    // ─── GET ALL (Restricted to Staff, Team Leads, Admins) ───────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public List<Ticket> getAllTickets(Authentication auth) {
        User currentUser = getCurrentUser(auth);
        if (hasRole(auth, "SYSTEM_ADMINISTRATOR")) {
            return ticketRepository.findAll();
        }

        return ticketRepository.findAll().stream()
                .filter(ticket -> ticket.getStatus() != Status.CANCELLED && ticket.getStatus() != Status.REJECTED)
                .filter(ticket -> sameDepartment(ticket.getDepartment(), currentUser.getDepartment()))
                .filter(ticket -> hasRole(auth, "TEAM_LEAD") ||
                        (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(currentUser.getId())) ||
                        ticket.getAssignedTo() == null)
                .toList();
    }

    // ─── GET MY TICKETS (All authenticated users for their own tickets) ──────
    @GetMapping("/my-tickets")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'KNOWLEDGE_MANAGER', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Ticket>> getMyTickets(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return ResponseEntity.ok(ticketRepository.findByCreatedById(user.getId()));
    }

    // ─── GET BY ID (Enforces Ownership for End-Users and Department for Staff) ─
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> getTicketById(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

        if (hasRole(auth, "SYSTEM_ADMINISTRATOR") || isCreator(ticket, currentUser)) {
            return ResponseEntity.ok(ticket);
        }

        if (!isStaffUser(auth) ||
                ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED ||
                (ticket.getDepartment() != null && !sameDepartment(ticket.getDepartment(), currentUser.getDepartment()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You are not authorized to view this ticket");
        }

        return ResponseEntity.ok(ticket);
    }

    // ─── CREATE TICKET (Direct Department Routing) ───────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> createTicket(@RequestBody Ticket ticket, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        ticket.setCreatedBy(currentUser);

        if (ticket.getCategory() != null && ticket.getCategory().getId() != null) {
            Category category = categoryRepository.findById(ticket.getCategory().getId()).orElse(null);
            ticket.setCategory(category);
        }

        String dept = ticket.getDepartment();
        if (dept == null || dept.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Department is required. Allowed values: IT, Maintenance, Security");
        }
        ticket.setDepartment(normalizeTechnicalDepartment(dept));

        if (ticket.getPriority() == null) {
            ticket.setPriority(Priority.MEDIUM);
        }

        ticket.setStatus(Status.OPEN);
        ticket.setAssignedTo(null);
        ticket.setResolvedAt(null);
        ticket.setResolutionNotes(null);

        Ticket savedTicket = ticketRepository.save(ticket);

        // Auto notification hook for department queue
        try {
            notificationService.notifyTicketCreated(savedTicket);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.status(HttpStatus.CREATED).body(savedTicket);
    }

    // ─── EDIT TICKET (Creator only, while status is OPEN) ────────────────────
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> updateTicket(@PathVariable Long id,
                                               @RequestBody Map<String, Object> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!isCreator(ticket, currentUser)) {
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
        if (body.containsKey("department") && body.get("department") != null) {
            String newDept = body.get("department").toString().trim();
            if (!newDept.isEmpty()) ticket.setDepartment(normalizeTechnicalDepartment(newDept));
        }
        if (body.containsKey("priority") && body.get("priority") != null) {
            try {
                ticket.setPriority(Priority.valueOf(body.get("priority").toString().toUpperCase()));
            } catch (IllegalArgumentException ignored) {}
        }
        if (body.containsKey("location") && body.get("location") != null) {
            ticket.setLocation(body.get("location").toString().trim());
        }
        if (body.containsKey("categoryId") && body.get("categoryId") != null) {
            Long catId = Long.valueOf(body.get("categoryId").toString());
            categoryRepository.findById(catId).ifPresent(ticket::setCategory);
        }

        Ticket saved = ticketRepository.save(ticket);
        return ResponseEntity.ok(saved);
    }

    // ─── CANCEL / REJECT TICKET (Soft Cancellation) ─────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> deleteOrCancelTicket(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        boolean isCreator = ticket.getCreatedBy() != null &&
                ticket.getCreatedBy().getId().equals(currentUser.getId());

        if (!isAdmin && !isCreator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only cancel your own tickets");
        }

        if (ticket.getStatus() != Status.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only OPEN tickets can be cancelled or rejected");
        }

        Status terminalStatus = isAdmin && !isCreator ? Status.REJECTED : Status.CANCELLED;
        ticket.setStatus(terminalStatus);
        Ticket saved = ticketRepository.save(ticket);

        if (terminalStatus == Status.REJECTED) {
            try {
                notificationService.notifyStatusUpdated(saved, Status.OPEN, Status.REJECTED);
            } catch (Exception e) {
                System.err.println("Notification trigger failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(saved);
    }

    // ─── PERMANENT DELETE (Restricted strictly to System Administrator) ──────
    @DeleteMapping("/{id}/permanent")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> permanentlyDeleteTicket(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        ticketDeletionService.permanentlyDelete(ticket);
        return ResponseEntity.noContent().build();
    }

    // ─── OPTIONAL / BACKWARD-COMPATIBLE TRIAGE ENDPOINTS ─────────────────────
    @Deprecated
    @PutMapping("/{id}/accept")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> acceptTicket(@PathVariable Long id, Authentication auth) {
        return reviewTicket(id, auth, Status.ACCEPTED);
    }

    @Deprecated
    @PutMapping("/{id}/reject")
    @PreAuthorize("hasAuthority('ROLE_SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> rejectTicket(@PathVariable Long id, Authentication auth) {
        return reviewTicket(id, auth, Status.REJECTED);
    }

    private ResponseEntity<Ticket> reviewTicket(Long id, Authentication auth, Status reviewStatus) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

        if (isCreator(ticket, currentUser)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Administrators must use owner actions for their own tickets");
        }
        if (ticket.getStatus() != Status.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only OPEN tickets can be reviewed");
        }

        ticket.setStatus(reviewStatus);
        Ticket saved = ticketRepository.save(ticket);
        try {
            notificationService.notifyStatusUpdated(saved, Status.OPEN, reviewStatus);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }
        return ResponseEntity.ok(saved);
    }

    @PutMapping("/{id}/route")
    @PreAuthorize("hasAnyRole('SYSTEM_ADMINISTRATOR', 'TEAM_LEAD')")
    public ResponseEntity<Ticket> routeTicket(@PathVariable Long id,
                                               @RequestBody Map<String, String> body) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Terminal tickets cannot be routed");
        }

        ticket.setDepartment(normalizeTechnicalDepartment(body.get("department")));
        ticket.setAssignedTo(null);
        return ResponseEntity.ok(ticketRepository.save(ticket));
    }

    // ─── CONFIRM RESOLUTION (Ticket Creator confirms resolution -> CLOSED) ───
    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> confirmResolution(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

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
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> reopenTicket(@PathVariable Long id,
                                               @RequestBody(required = false) Map<String, String> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

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

    // ─── UPDATE STATUS (Agents, Team Leads, Admins) ──────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id,
                                                @RequestBody Map<String, String> body,
                                                Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

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

        if (ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Terminal tickets cannot be moved to another status");
        }
        if (newStatus == Status.OPEN || newStatus == Status.ACCEPTED ||
                newStatus == Status.CANCELLED || newStatus == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This status requires its dedicated workflow action");
        }

        boolean isAdmin = hasRole(auth, "SYSTEM_ADMINISTRATOR");
        boolean isLead = hasRole(auth, "TEAM_LEAD");
        boolean isAgent = hasRole(auth, "SUPPORT_AGENT");

        if (!isAdmin && !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff can only update tickets in their technical department");
        }

        if (isAgent) {
            if (ticket.getStatus() == Status.OPEN && newStatus == Status.IN_PROGRESS) {
                if (ticket.getAssignedTo() == null) {
                    ticket.setAssignedTo(currentUser);
                } else if (!ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                    throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                            "Support Agents can only update tickets assigned to them");
                }
            } else if (ticket.getAssignedTo() == null || !ticket.getAssignedTo().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Support Agents can only update tickets assigned to them");
            }
        }

        Status oldStatus = ticket.getStatus();
        boolean allowedTransition = switch (oldStatus) {
            case OPEN -> newStatus == Status.IN_PROGRESS;
            case IN_PROGRESS -> newStatus == Status.RESOLVED;
            case RESOLVED -> newStatus == Status.CLOSED || newStatus == Status.REOPENED;
            case CLOSED -> newStatus == Status.REOPENED;
            case REOPENED -> newStatus == Status.IN_PROGRESS || newStatus == Status.RESOLVED;
            case ACCEPTED -> newStatus == Status.IN_PROGRESS;
            default -> false;
        };
        if (!allowedTransition) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid ticket status transition from " + oldStatus + " to " + newStatus);
        }

        if (newStatus == Status.RESOLVED) {
            String notes = body.get("resolutionNotes");
            if (notes == null || notes.isBlank()) {
                notes = body.get("resolutionDetails");
            }
            if (notes == null || notes.isBlank()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Resolution notes are required when resolving a ticket");
            }
            ticket.setResolutionNotes(notes.trim());
            ticket.setResolvedAt(LocalDateTime.now());
        } else if (newStatus == Status.OPEN || newStatus == Status.REOPENED) {
            ticket.setResolvedAt(null);
        }

        ticket.setStatus(newStatus);
        Ticket updated = ticketRepository.save(ticket);

        if (oldStatus != newStatus) {
            try {
                notificationService.notifyStatusUpdated(updated, oldStatus, newStatus);
            } catch (Exception e) {
                System.err.println("Notification trigger failed: " + e.getMessage());
            }
        }

        return ResponseEntity.ok(updated);
    }

    // ─── CLAIM TICKET (Support Agent self-assigns an unassigned ticket) ───────
    @PutMapping("/{id}/claim")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD')")
    public ResponseEntity<Ticket> claimTicket(@PathVariable Long id, Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

        if (!sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "You can only claim tickets in your technical department");
        }

        if (ticket.getStatus() != Status.OPEN && ticket.getStatus() != Status.REOPENED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only OPEN or REOPENED tickets can be claimed");
        }

        if (ticket.getAssignedTo() != null && !ticket.getAssignedTo().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket is already assigned to another agent");
        }

        ticket.setAssignedTo(currentUser);
        ticket.setStatus(Status.IN_PROGRESS);
        Ticket updated = ticketRepository.save(ticket);

        try {
            notificationService.notifyTicketAssigned(updated, currentUser);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return ResponseEntity.ok(updated);
    }

    // ─── ASSIGN / REASSIGN AGENT (Department Team Lead & Administrator) ────
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> assignTicket(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body,
                                                Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

        if (ticket.getStatus() != Status.OPEN && ticket.getStatus() != Status.ACCEPTED &&
                ticket.getStatus() != Status.IN_PROGRESS && ticket.getStatus() != Status.REOPENED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only open, accepted, or active routed tickets can be assigned or reassigned");
        }
        if (ticket.getDepartment() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket must be routed to a technical department before assignment");
        }

        boolean isAdmin = hasRole(auth, "SYSTEM_ADMINISTRATOR");

        if (!isAdmin && !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff can only assign tickets in their technical department");
        }

        Object agentIdObj = body.get("agentId");
        User assignedAgent = null;
        if (agentIdObj == null) {
            ticket.setAssignedTo(null);
        } else {
            Long agentId = Long.valueOf(agentIdObj.toString());
            assignedAgent = userRepository.findById(agentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));

            if (assignedAgent.getRole() != Role.SUPPORT_AGENT) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Tickets can only be assigned to Support Agents");
            }
            if (!sameDepartment(ticket.getDepartment(), assignedAgent.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Support Agent must belong to the routed technical department");
            }

            ticket.setAssignedTo(assignedAgent);

            if (ticket.getStatus() == Status.OPEN || ticket.getStatus() == Status.ACCEPTED || ticket.getStatus() == Status.REOPENED) {
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
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
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
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
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
