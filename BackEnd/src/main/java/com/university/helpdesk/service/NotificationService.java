package com.university.helpdesk.service;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.NotificationRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TicketCommentRepository commentRepository;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               TicketCommentRepository commentRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
    }

    // ─── TICKET CREATED ──────────────────────────────────────────────────────
    public void notifyTicketCreated(Ticket ticket) {
        if (ticket == null) return;
        List<User> agentsAndAdmins = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.ADMIN ||
                             u.getRole() == Role.SUPPORT_AGENT ||
                             u.getRole() == Role.DEPARTMENT_MANAGER)
                .toList();

        String title = "➕ New Support Ticket Submitted";
        String message = "Ticket " + ticket.getTicketNumber() + " ('" + ticket.getTitle() + "') was created by " +
                (ticket.getCreatedBy() != null ? ticket.getCreatedBy().getFullName() : "a student") + ".";

        List<Notification> notifications = new ArrayList<>();
        for (User agent : agentsAndAdmins) {
            // don't notify creator if creator is an agent
            if (ticket.getCreatedBy() != null && Objects.equals(agent.getId(), ticket.getCreatedBy().getId())) {
                continue;
            }
            notifications.add(new Notification(agent, title, message, NotificationType.TICKET_CREATED, ticket.getId()));
        }

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    // ─── TICKET ASSIGNED ─────────────────────────────────────────────────────
    public void notifyTicketAssigned(Ticket ticket, User agent) {
        if (ticket == null || agent == null) return;

        String title = "👤 Ticket Assigned to You";
        String message = "You have been assigned to Ticket " + ticket.getTicketNumber() + ": '" + ticket.getTitle() + "'.";

        Notification notification = new Notification(agent, title, message, NotificationType.TICKET_ASSIGNED, ticket.getId());
        notificationRepository.save(notification);
    }

    // ─── TICKET STATUS UPDATED ───────────────────────────────────────────────
    public void notifyStatusUpdated(Ticket ticket, Status oldStatus, Status newStatus) {
        if (ticket == null || ticket.getCreatedBy() == null) return;

        User owner = ticket.getCreatedBy();
        String title = "🔄 Ticket Status Updated (" + newStatus.name().replace('_', ' ') + ")";
        String message = "Your ticket " + ticket.getTicketNumber() + " status changed from " +
                oldStatus.name().replace('_', ' ') + " to " + newStatus.name().replace('_', ' ') + ".";

        Notification notification = new Notification(owner, title, message, NotificationType.STATUS_UPDATED, ticket.getId());
        notificationRepository.save(notification);

        // If ticket resolved, also send CSAT request notification
        if (newStatus == Status.RESOLVED) {
            String csatTitle = "⭐ Rate Your Experience";
            String csatMessage = "Ticket " + ticket.getTicketNumber() + " has been resolved! Click to share your 1-5 star feedback.";
            Notification csatNotification = new Notification(owner, csatTitle, csatMessage, NotificationType.CSAT_REQUEST, ticket.getId());
            notificationRepository.save(csatNotification);
        }
    }

    // ─── NEW COMMENT ─────────────────────────────────────────────────────────
    public void notifyNewComment(Ticket ticket, TicketComment comment) {
        if (ticket == null || comment == null) return;

        User author = comment.getAuthor();
        Long authorId = author != null ? author.getId() : null;

        Set<User> recipients = new HashSet<>();

        // Add ticket owner
        if (ticket.getCreatedBy() != null && !Objects.equals(ticket.getCreatedBy().getId(), authorId)) {
            recipients.add(ticket.getCreatedBy());
        }

        // Add assigned agent
        if (ticket.getAssignedTo() != null && !Objects.equals(ticket.getAssignedTo().getId(), authorId)) {
            recipients.add(ticket.getAssignedTo());
        }

        // Add previous commenters
        List<TicketComment> existingComments = commentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId());
        for (TicketComment c : existingComments) {
            if (c.getAuthor() != null && !Objects.equals(c.getAuthor().getId(), authorId)) {
                recipients.add(c.getAuthor());
            }
        }

        String title = "💬 New Reply on Ticket " + ticket.getTicketNumber();
        String authorName = author != null ? author.getFullName() : "A user";
        String snippet = comment.getContent().length() > 60
                ? comment.getContent().substring(0, 60) + "..."
                : comment.getContent();
        String message = authorName + " commented: \"" + snippet + "\"";

        List<Notification> notifications = new ArrayList<>();
        for (User r : recipients) {
            notifications.add(new Notification(r, title, message, NotificationType.NEW_COMMENT, ticket.getId()));
        }

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }
}
