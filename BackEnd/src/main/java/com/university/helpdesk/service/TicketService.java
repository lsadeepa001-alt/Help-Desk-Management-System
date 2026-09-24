package com.university.helpdesk.service;

import com.university.helpdesk.dto.TicketRequest;
import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

@Service
@Transactional
public class TicketService {

    private static final Set<String> TECHNICAL_DEPARTMENTS = Set.of("IT", "MAINTENANCE", "SECURITY");

    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final TicketCommentRepository commentRepository;
    private final NotificationService notificationService;

    public TicketService(TicketRepository ticketRepository,
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

    public String normalizeTechnicalDepartment(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department is required. Allowed values: IT, Maintenance, Security");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!TECHNICAL_DEPARTMENTS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid department. Allowed values: IT, Maintenance, Security");
        }
        return switch (normalized) {
            case "IT" -> "IT";
            case "MAINTENANCE" -> "Maintenance";
            case "SECURITY" -> "Security";
            default -> throw new IllegalStateException("Unexpected department: " + normalized);
        };
    }

    public boolean sameDepartment(String first, String second) {
        return first != null && second != null && first.trim().equalsIgnoreCase(second.trim());
    }

    public Ticket createTicket(Ticket ticket, User currentUser) {
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

        Ticket saved = ticketRepository.save(ticket);

        try {
            notificationService.notifyTicketCreated(saved);
        } catch (Exception e) {
            System.err.println("Notification trigger failed: " + e.getMessage());
        }

        return saved;
    }

    public Ticket createTicketFromRequest(TicketRequest request, User currentUser) {
        Ticket ticket = new Ticket();
        ticket.setTitle(request.getTitle());
        ticket.setDescription(request.getDescription());
        ticket.setDepartment(request.getDepartment());
        ticket.setPriority(request.getPriority() != null ? request.getPriority() : Priority.MEDIUM);
        ticket.setLocation(request.getLocation());
        ticket.setTicketNumber(request.getTicketNumber());

        if (request.getCategoryId() != null) {
            categoryRepository.findById(request.getCategoryId()).ifPresent(ticket::setCategory);
        }

        return createTicket(ticket, currentUser);
    }

    public Ticket claimTicket(Long id, User currentUser) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

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

        return updated;
    }

    public Ticket assignTicket(Long id, Long agentId, User currentUser, boolean isAdmin) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (ticket.getStatus() != Status.OPEN && ticket.getStatus() != Status.ACCEPTED &&
                ticket.getStatus() != Status.IN_PROGRESS && ticket.getStatus() != Status.REOPENED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only open or active routed tickets can be assigned or reassigned");
        }
        if (ticket.getDepartment() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Ticket must belong to a technical department before assignment");
        }

        if (!isAdmin && !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Staff can only assign tickets in their technical department");
        }

        User assignedAgent = null;
        if (agentId == null) {
            ticket.setAssignedTo(null);
        } else {
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

        return updated;
    }

    public Ticket updateStatus(Long id, Status newStatus, String notes, User currentUser,
                               boolean isAdmin, boolean isLead, boolean isAgent) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (ticket.getStatus() == Status.CANCELLED || ticket.getStatus() == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Terminal tickets cannot be moved to another status");
        }
        if (newStatus == Status.OPEN || newStatus == Status.ACCEPTED ||
                newStatus == Status.CANCELLED || newStatus == Status.REJECTED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "This status requires its dedicated workflow action");
        }

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

        return updated;
    }

    public Ticket confirmResolution(Long id, User currentUser, boolean isAdmin) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

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

        return updated;
    }

    public Ticket reopenTicket(Long id, String reason, User currentUser, boolean isAdmin) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (!isAdmin && (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId()))) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: Only the ticket creator can reopen this ticket");
        }

        if (ticket.getStatus() != Status.RESOLVED && ticket.getStatus() != Status.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only RESOLVED or CLOSED tickets can be reopened");
        }

        Status oldStatus = ticket.getStatus();
        ticket.setStatus(Status.REOPENED);
        ticket.setResolvedAt(null);

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

        return updated;
    }

    public Ticket softCancelOrReject(Long id, User currentUser, boolean isAdmin) {
        Ticket ticket = ticketRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        boolean isCreator = ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(currentUser.getId());
        if (!isAdmin && !isCreator) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You can only cancel your own tickets");
        }

        if (ticket.getStatus() != Status.OPEN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Only OPEN tickets can be cancelled or rejected");
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

        return saved;
    }
}
