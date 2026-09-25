package com.university.helpdesk.service;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.NotificationRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.UserNotificationPreferencesRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final TicketCommentRepository commentRepository;
    private final UserNotificationPreferencesRepository preferencesRepository;
    private final EmailService emailService;

    public NotificationService(NotificationRepository notificationRepository,
                               UserRepository userRepository,
                               TicketCommentRepository commentRepository,
                               UserNotificationPreferencesRepository preferencesRepository,
                               EmailService emailService) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.commentRepository = commentRepository;
        this.preferencesRepository = preferencesRepository;
        this.emailService = emailService;
    }

    private UserNotificationPreferences getPreferences(User user) {
        if (user == null || user.getId() == null) {
            return new UserNotificationPreferences();
        }
        return preferencesRepository.findByUserId(user.getId())
                .orElseGet(() -> new UserNotificationPreferences(user));
    }

    // ─── TICKET CREATED ──────────────────────────────────────────────────────
    public void notifyTicketCreated(Ticket ticket) {
        if (ticket == null) return;
        List<User> targetRecipients = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SYSTEM_ADMINISTRATOR ||
                        ((u.getRole() == Role.TEAM_LEAD || u.getRole() == Role.SUPPORT_AGENT) &&
                                ticket.getDepartment() != null &&
                                ticket.getDepartment().equalsIgnoreCase(u.getDepartment())))
                .toList();

        String deptName = ticket.getDepartment() != null ? ticket.getDepartment() : "General";
        String title = "➕ New Support Ticket Submitted (" + deptName + ")";
        String message = "Ticket " + ticket.getTicketNumber() + " ('" + ticket.getTitle() + "') was submitted to " +
                deptName + " by " +
                (ticket.getCreatedBy() != null ? ticket.getCreatedBy().getFullName() : "a user") + ".";

        List<Notification> notifications = new ArrayList<>();
        for (User recipient : targetRecipients) {
            if (ticket.getCreatedBy() != null && Objects.equals(recipient.getId(), ticket.getCreatedBy().getId())) {
                continue;
            }
            UserNotificationPreferences prefs = getPreferences(recipient);
            if (prefs.isTicketCreatedEnabled()) {
                if (prefs.isInAppEnabled()) {
                    notifications.add(new Notification(recipient, title, message, NotificationType.TICKET_CREATED, ticket.getId()));
                }
                if (prefs.isEmailEnabled() && recipient.getEmail() != null && !recipient.getEmail().isBlank()) {
                    emailService.sendEmail(recipient.getEmail(), title, message);
                }
            }
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

        UserNotificationPreferences prefs = getPreferences(agent);
        if (prefs.isTicketAssignedEnabled()) {
            if (prefs.isInAppEnabled()) {
                Notification notification = new Notification(agent, title, message, NotificationType.TICKET_ASSIGNED, ticket.getId());
                notificationRepository.save(notification);
            }
            if (prefs.isEmailEnabled() && agent.getEmail() != null && !agent.getEmail().isBlank()) {
                emailService.sendEmail(agent.getEmail(), title, message);
            }
        }
    }

    // ─── TICKET STATUS UPDATED ───────────────────────────────────────────────
    public void notifyStatusUpdated(Ticket ticket, Status oldStatus, Status newStatus) {
        if (ticket == null || ticket.getCreatedBy() == null) return;

        User owner = ticket.getCreatedBy();
        String title = "🔄 Ticket Status Updated (" + newStatus.name().replace('_', ' ') + ")";
        String message = "Your ticket " + ticket.getTicketNumber() + " status changed from " +
                oldStatus.name().replace('_', ' ') + " to " + newStatus.name().replace('_', ' ') + ".";

        UserNotificationPreferences prefs = getPreferences(owner);
        if (prefs.isStatusUpdatedEnabled()) {
            if (prefs.isInAppEnabled()) {
                Notification notification = new Notification(owner, title, message, NotificationType.STATUS_UPDATED, ticket.getId());
                notificationRepository.save(notification);
            }
            if (prefs.isEmailEnabled() && owner.getEmail() != null && !owner.getEmail().isBlank()) {
                emailService.sendEmail(owner.getEmail(), title, message);
            }
        }

        // If ticket resolved, also send CSAT request notification
        if (newStatus == Status.RESOLVED && prefs.isCsatRequestEnabled()) {
            String csatTitle = "⭐ Rate Your Experience";
            String csatMessage = "Ticket " + ticket.getTicketNumber() + " has been resolved! Click to share your 1-5 star feedback.";
            if (prefs.isInAppEnabled()) {
                Notification csatNotification = new Notification(owner, csatTitle, csatMessage, NotificationType.CSAT_REQUEST, ticket.getId());
                notificationRepository.save(csatNotification);
            }
            if (prefs.isEmailEnabled() && owner.getEmail() != null && !owner.getEmail().isBlank()) {
                emailService.sendEmail(owner.getEmail(), csatTitle, csatMessage);
            }
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
            UserNotificationPreferences prefs = getPreferences(r);
            if (prefs.isNewCommentEnabled()) {
                if (prefs.isInAppEnabled()) {
                    notifications.add(new Notification(r, title, message, NotificationType.NEW_COMMENT, ticket.getId()));
                }
                if (prefs.isEmailEnabled() && r.getEmail() != null && !r.getEmail().isBlank()) {
                    emailService.sendEmail(r.getEmail(), title, message);
                }
            }
        }

        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }
}
