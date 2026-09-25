package com.university.helpdesk.controller;

import com.university.helpdesk.model.*;
import com.university.helpdesk.dto.AssignmentHistoryDTO;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.TicketAssignmentHistoryRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.NotificationService;
import com.university.helpdesk.service.TicketDeletionService;
import com.university.helpdesk.service.TicketService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/tickets")
public class TicketController {

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TicketCommentRepository commentRepository;
    private final NotificationService notificationService;
    private final TicketDeletionService ticketDeletionService;
    private final TicketService ticketService;
    private final TicketAssignmentHistoryRepository assignmentHistoryRepository;
    private final com.university.helpdesk.service.AgentActivityLogService agentActivityLogService;

    private static final Set<String> TECHNICAL_DEPARTMENTS = Set.of("IT", "MAINTENANCE", "SECURITY");

    public TicketController(TicketRepository ticketRepository,
                            UserRepository userRepository,
                            CategoryRepository categoryRepository,
                            TicketCommentRepository commentRepository,
                            NotificationService notificationService,
                            TicketDeletionService ticketDeletionService,
                            TicketService ticketService,
                            TicketAssignmentHistoryRepository assignmentHistoryRepository,
                            com.university.helpdesk.service.AgentActivityLogService agentActivityLogService) {
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.commentRepository = commentRepository;
        this.notificationService = notificationService;
        this.ticketDeletionService = ticketDeletionService;
        this.ticketService = ticketService;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.agentActivityLogService = agentActivityLogService;
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
    public List<Ticket> getAllTickets(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            Authentication auth) {
        User currentUser = getCurrentUser(auth);

        java.time.LocalDateTime from = dateFrom != null && !dateFrom.isBlank()
                ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        java.time.LocalDateTime to = dateTo != null && !dateTo.isBlank()
                ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;

        var stream = ticketRepository.findAll().stream();

        if (hasRole(auth, "SYSTEM_ADMINISTRATOR")) {
            // Admin sees all tickets
        } else {
            stream = stream
                    .filter(ticket -> ticket.getStatus() != Status.CANCELLED && ticket.getStatus() != Status.REJECTED)
                    .filter(ticket -> sameDepartment(ticket.getDepartment(), currentUser.getDepartment()))
                    .filter(ticket -> hasRole(auth, "TEAM_LEAD") ||
                            (ticket.getAssignedTo() != null && ticket.getAssignedTo().getId().equals(currentUser.getId())) ||
                            ticket.getAssignedTo() == null);
        }

        // Apply optional filters (do NOT bypass role-based visibility)
        if (categoryId != null) {
            stream = stream.filter(t -> t.getCategory() != null && categoryId.equals(t.getCategory().getId()));
        }
        if (from != null) {
            stream = stream.filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(from));
        }
        if (to != null) {
            stream = stream.filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isAfter(to));
        }

        return stream.toList();
    }

    // ─── GET MY TICKETS (All authenticated users for their own tickets) ──────
    @GetMapping("/my-tickets")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'KNOWLEDGE_MANAGER', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Ticket>> getMyTickets(
            @RequestParam(required = false) Long categoryId,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo,
            Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        User user = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        java.time.LocalDateTime from = dateFrom != null && !dateFrom.isBlank()
                ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        java.time.LocalDateTime to = dateTo != null && !dateTo.isBlank()
                ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;

        var stream = ticketRepository.findByCreatedById(user.getId()).stream();
        if (categoryId != null) {
            stream = stream.filter(t -> t.getCategory() != null && categoryId.equals(t.getCategory().getId()));
        }
        if (from != null) {
            stream = stream.filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isBefore(from));
        }
        if (to != null) {
            stream = stream.filter(t -> t.getCreatedAt() != null && !t.getCreatedAt().isAfter(to));
        }
        return ResponseEntity.ok(stream.toList());
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
        Ticket savedTicket = ticketService.createTicket(ticket, currentUser);
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
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        Ticket saved = ticketService.softCancelOrReject(id, currentUser, isAdmin);
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
                                               @RequestBody Map<String, String> body,
                                               Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = getCurrentUser(auth);
        boolean isAdmin = hasRole(auth, "SYSTEM_ADMINISTRATOR");

        if (ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Terminal tickets cannot be routed");
        }

        // Team Lead can only reroute tickets in their own department
        if (!isAdmin) {
            if (ticket.getDepartment() == null || !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Team Leads can only reroute tickets in their own department");
            }
        }

        String previousDepartment = ticket.getDepartment();
        User previousAgent = ticket.getAssignedTo();
        boolean wasRerouted = previousDepartment != null;

        String newDepartment = normalizeTechnicalDepartment(body.get("department"));
        ticket.setDepartment(newDepartment);

        // If rerouting removes assigned agent (department changes), do NOT leave IN_PROGRESS with no agent
        if (!sameDepartment(previousDepartment, newDepartment) && ticket.getAssignedTo() != null) {
            ticket.setAssignedTo(null);
            if (ticket.getStatus() == Status.IN_PROGRESS) {
                ticket.setStatus(Status.OPEN);
            }
        } else if (!sameDepartment(previousDepartment, newDepartment)) {
            ticket.setAssignedTo(null);
        }

        Ticket saved = ticketRepository.save(ticket);

        // Record agent activity log
        try {
            boolean isReroutedAction = wasRerouted && !sameDepartment(previousDepartment, newDepartment);
            agentActivityLogService.logActivity(currentUser, saved,
                    isReroutedAction ? AgentActivityAction.TICKET_REROUTED : AgentActivityAction.TICKET_ROUTED,
                    isReroutedAction
                            ? "Ticket rerouted from " + previousDepartment + " to " + newDepartment
                            : "Ticket routed to " + newDepartment);
        } catch (Exception e) {
            System.err.println("Agent activity log recording failed: " + e.getMessage());
        }

        // Record routing history
        try {
            TicketAssignmentHistory history = new TicketAssignmentHistory();
            history.setTicket(saved);
            history.setAction(wasRerouted && !sameDepartment(previousDepartment, newDepartment) ? AssignmentAction.REROUTED : AssignmentAction.ROUTED);
            history.setPreviousDepartment(previousDepartment);
            history.setNewDepartment(newDepartment);
            history.setPreviousAgent(previousAgent);
            history.setNewAgent(saved.getAssignedTo());
            history.setChangedBy(currentUser);
            assignmentHistoryRepository.save(history);
        } catch (Exception e) {
            System.err.println("Assignment history recording failed: " + e.getMessage());
        }

        return ResponseEntity.ok(saved);
    }

    // ─── CONFIRM RESOLUTION (Ticket Creator confirms resolution -> CLOSED) ───
    @PutMapping("/{id}/confirm")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> confirmResolution(@PathVariable Long id, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        return ResponseEntity.ok(ticketService.confirmResolution(id, currentUser, isAdmin));
    }

    // ─── REOPEN TICKET (Ticket Creator reopens -> REOPENED with reason) ───────
    @PutMapping("/{id}/reopen")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> reopenTicket(@PathVariable Long id,
                                               @RequestBody(required = false) Map<String, String> body,
                                               Authentication auth) {
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        String reason = body != null ? body.get("reason") : null;
        return ResponseEntity.ok(ticketService.reopenTicket(id, reason, currentUser, isAdmin));
    }

    // ─── UPDATE STATUS (Agents, Team Leads, Admins) ──────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> updateStatus(@PathVariable Long id,
                                                @RequestBody Map<String, String> body,
                                                Authentication auth) {
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

        String notes = body.get("resolutionNotes");
        if (notes == null || notes.isBlank()) {
            notes = body.get("resolutionDetails");
        }

        boolean isAdmin = hasRole(auth, "SYSTEM_ADMINISTRATOR");
        boolean isLead = hasRole(auth, "TEAM_LEAD");
        boolean isAgent = hasRole(auth, "SUPPORT_AGENT");

        Ticket updated = ticketService.updateStatus(id, newStatus, notes, currentUser, isAdmin, isLead, isAgent);
        return ResponseEntity.ok(updated);
    }

    // ─── CLAIM TICKET (Support Agent self-assigns an unassigned ticket) ───────
    @PutMapping("/{id}/claim")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD')")
    public ResponseEntity<Ticket> claimTicket(@PathVariable Long id, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        return ResponseEntity.ok(ticketService.claimTicket(id, currentUser));
    }

    // ─── ASSIGN / REASSIGN AGENT (Department Team Lead & Administrator) ────
    @PutMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Ticket> assignTicket(@PathVariable Long id,
                                                @RequestBody Map<String, Object> body,
                                                Authentication auth) {
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = hasRole(auth, "SYSTEM_ADMINISTRATOR");
        Object agentIdObj = body.get("agentId");
        Long agentId = agentIdObj != null ? Long.valueOf(agentIdObj.toString()) : null;
        return ResponseEntity.ok(ticketService.assignTicket(id, agentId, currentUser, isAdmin));
    }

    private void validateCommentAccess(Ticket ticket, User currentUser, Authentication auth) {
        if (hasRole(auth, "SYSTEM_ADMINISTRATOR")) {
            return;
        }

        if (hasRole(auth, "STUDENT") || hasRole(auth, "LECTURER")) {
            if (!isCreator(ticket, currentUser)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: You can only access comments on your own tickets");
            }
            return;
        }

        if (hasRole(auth, "SUPPORT_AGENT")) {
            if (ticket.getAssignedTo() == null ||
                    !ticket.getAssignedTo().getId().equals(currentUser.getId()) ||
                    !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: Support agents can only access comments on tickets assigned to them in their department");
            }
            return;
        }

        if (hasRole(auth, "TEAM_LEAD")) {
            if (!sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: Team leads can only access comments on tickets in their department");
            }
            return;
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Unauthorized role for comments");
    }

    // ─── POST COMMENT (Forces isInternal=false for End-Users) ─────────────────
    @PostMapping("/{id}/comments")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<TicketComment> addComment(@PathVariable Long id,
                                                     @RequestBody Map<String, Object> body,
                                                     Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User author = getCurrentUser(auth);
        validateCommentAccess(ticket, author, auth);

        String content = (String) body.get("content");
        if (content == null || content.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
        }

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthor(author);
        comment.setContent(content.trim());

        // Internal note validation: ONLY staff can mark comment as internal
        boolean isStaff = isStaffUser(auth);
        Object isInternalObj = body.get("isInternal");
        if (isStaff && isInternalObj != null) {
            comment.setInternal(Boolean.parseBoolean(isInternalObj.toString()));
        } else {
            comment.setInternal(false);
        }

        TicketComment saved = commentRepository.save(comment);

        // Record agent activity log
        try {
            if (saved.isInternal()) {
                agentActivityLogService.logActivity(author, ticket, AgentActivityAction.INTERNAL_NOTE_ADDED,
                        "Internal note added by " + (author.getFullName() != null ? author.getFullName() : author.getUsername()));
            } else {
                agentActivityLogService.logActivity(author, ticket, AgentActivityAction.PUBLIC_COMMENT_ADDED,
                        "Public comment added by " + (author.getFullName() != null ? author.getFullName() : author.getUsername()));
            }
        } catch (Exception e) {
            System.err.println("Agent activity log recording failed: " + e.getMessage());
        }

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
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = getCurrentUser(auth);
        validateCommentAccess(ticket, currentUser, auth);

        boolean isStaff = isStaffUser(auth);
        List<TicketComment> comments = isStaff
                ? commentRepository.findByTicketIdOrderByCreatedAtAsc(id)
                : commentRepository.findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(id);

        return ResponseEntity.ok(comments);
    }

    // ─── GET ASSIGNMENT HISTORY (Same access rules as ticket read) ────────────
    @GetMapping("/{id}/assignment-history")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<AssignmentHistoryDTO>> getAssignmentHistory(@PathVariable Long id,
                                                                            Authentication auth) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));
        User currentUser = getCurrentUser(auth);

        // Apply same access rules as GET /tickets/{id}
        if (!hasRole(auth, "SYSTEM_ADMINISTRATOR") && !isCreator(ticket, currentUser)) {
            if (!isStaffUser(auth) ||
                    ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED ||
                    (ticket.getDepartment() != null && !sameDepartment(ticket.getDepartment(), currentUser.getDepartment()))) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: You are not authorized to view this ticket's history");
            }
        }

        List<AssignmentHistoryDTO> history = assignmentHistoryRepository
                .findByTicketIdOrderByChangedAtAsc(id)
                .stream()
                .map(AssignmentHistoryDTO::from)
                .toList();

        return ResponseEntity.ok(history);
    }

    // ─── GET CATEGORIES ──────────────────────────────────────────────────────
    @GetMapping("/categories")
    public ResponseEntity<List<Category>> getCategories() {
        return ResponseEntity.ok(categoryRepository.findAll());
    }
}
