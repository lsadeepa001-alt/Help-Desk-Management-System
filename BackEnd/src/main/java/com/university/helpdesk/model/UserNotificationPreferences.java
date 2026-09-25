package com.university.helpdesk.model;

import jakarta.persistence.*;

/**
 * Per-user notification delivery preferences.
 * Created on first access with all-enabled defaults.
 */
@Entity
@Table(name = "user_notification_preferences")
public class UserNotificationPreferences {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(optional = false, fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false, unique = true)
    private User user;

    @Column(nullable = false)
    private boolean inAppEnabled = true;

    @Column(nullable = false)
    private boolean emailEnabled = false;

    @Column(nullable = false)
    private boolean ticketCreatedEnabled = true;

    @Column(nullable = false)
    private boolean ticketAssignedEnabled = true;

    @Column(nullable = false)
    private boolean statusUpdatedEnabled = true;

    @Column(nullable = false)
    private boolean newCommentEnabled = true;

    @Column(nullable = false)
    private boolean csatRequestEnabled = true;

    public UserNotificationPreferences() {}

    public UserNotificationPreferences(User user) {
        this.user = user;
    }

    // Getters and setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public User getUser() { return user; }
    public void setUser(User user) { this.user = user; }

    public boolean isInAppEnabled() { return inAppEnabled; }
    public void setInAppEnabled(boolean inAppEnabled) { this.inAppEnabled = inAppEnabled; }

    public boolean isEmailEnabled() { return emailEnabled; }
    public void setEmailEnabled(boolean emailEnabled) { this.emailEnabled = emailEnabled; }

    public boolean isTicketCreatedEnabled() { return ticketCreatedEnabled; }
    public void setTicketCreatedEnabled(boolean ticketCreatedEnabled) { this.ticketCreatedEnabled = ticketCreatedEnabled; }

    public boolean isTicketAssignedEnabled() { return ticketAssignedEnabled; }
    public void setTicketAssignedEnabled(boolean ticketAssignedEnabled) { this.ticketAssignedEnabled = ticketAssignedEnabled; }

    public boolean isStatusUpdatedEnabled() { return statusUpdatedEnabled; }
    public void setStatusUpdatedEnabled(boolean statusUpdatedEnabled) { this.statusUpdatedEnabled = statusUpdatedEnabled; }

    public boolean isNewCommentEnabled() { return newCommentEnabled; }
    public void setNewCommentEnabled(boolean newCommentEnabled) { this.newCommentEnabled = newCommentEnabled; }

    public boolean isCsatRequestEnabled() { return csatRequestEnabled; }
    public void setCsatRequestEnabled(boolean csatRequestEnabled) { this.csatRequestEnabled = csatRequestEnabled; }
}
