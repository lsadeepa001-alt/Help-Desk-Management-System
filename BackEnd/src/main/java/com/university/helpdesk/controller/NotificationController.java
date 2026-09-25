package com.university.helpdesk.controller;

import com.university.helpdesk.model.Notification;
import com.university.helpdesk.model.User;
import com.university.helpdesk.model.UserNotificationPreferences;
import com.university.helpdesk.repository.NotificationRepository;
import com.university.helpdesk.repository.UserNotificationPreferencesRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final UserNotificationPreferencesRepository preferencesRepository;

    public NotificationController(NotificationRepository notificationRepository,
                                   UserRepository userRepository,
                                   UserNotificationPreferencesRepository preferencesRepository) {
        this.notificationRepository = notificationRepository;
        this.userRepository = userRepository;
        this.preferencesRepository = preferencesRepository;
    }

    // ─── GET NOTIFICATIONS FOR CURRENT USER (IDOR fixed: no ?userId=) ──────
    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> getUserNotifications(Authentication auth) {
        User currentUser = resolveCurrentUser(auth);
        List<Notification> list = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(currentUser.getId());
        long unreadCount = notificationRepository.countByRecipientIdAndIsReadFalse(currentUser.getId());

        Map<String, Object> result = new HashMap<>();
        result.put("notifications", list);
        result.put("unreadCount", unreadCount);
        return ResponseEntity.ok(result);
    }

    // ─── MARK SINGLE AS READ (Object-level: must own notification) ───────────
    @PutMapping("/{id}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id, Authentication auth) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        User currentUser = resolveCurrentUser(auth);
        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You cannot modify another user's notifications");
        }

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(saved);
    }

    // ─── MARK ALL AS READ FOR CURRENT USER ───────────────────────────────────
    @PutMapping("/read-all")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Map<String, Object>> markAllAsRead(Authentication auth) {
        User currentUser = resolveCurrentUser(auth);
        notificationRepository.markAllAsReadForUser(currentUser.getId());
        return ResponseEntity.ok(Map.of("success", true, "message", "All notifications marked as read."));
    }

    // ─── DELETE NOTIFICATION (Object-level: must own notification) ───────────
    @DeleteMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id, Authentication auth) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        User currentUser = resolveCurrentUser(auth);
        if (!notification.getRecipient().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You cannot delete another user's notifications");
        }

        notificationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── GET PREFERENCES (Current user only) ─────────────────────────────────
    @GetMapping("/preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserNotificationPreferences> getPreferences(Authentication auth) {
        User currentUser = resolveCurrentUser(auth);
        UserNotificationPreferences prefs = preferencesRepository.findByUserId(currentUser.getId())
                .orElseGet(() -> createDefaultPreferences(currentUser));
        return ResponseEntity.ok(prefs);
    }

    // ─── UPDATE PREFERENCES (Current user only) ───────────────────────────────
    @PutMapping("/preferences")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<UserNotificationPreferences> updatePreferences(
            @RequestBody Map<String, Object> body, Authentication auth) {
        User currentUser = resolveCurrentUser(auth);
        UserNotificationPreferences prefs = preferencesRepository.findByUserId(currentUser.getId())
                .orElseGet(() -> createDefaultPreferences(currentUser));

        // Update only fields provided
        if (body.containsKey("inAppEnabled")) prefs.setInAppEnabled(Boolean.parseBoolean(body.get("inAppEnabled").toString()));
        if (body.containsKey("emailEnabled")) prefs.setEmailEnabled(Boolean.parseBoolean(body.get("emailEnabled").toString()));
        if (body.containsKey("ticketCreatedEnabled")) prefs.setTicketCreatedEnabled(Boolean.parseBoolean(body.get("ticketCreatedEnabled").toString()));
        if (body.containsKey("ticketAssignedEnabled")) prefs.setTicketAssignedEnabled(Boolean.parseBoolean(body.get("ticketAssignedEnabled").toString()));
        if (body.containsKey("statusUpdatedEnabled")) prefs.setStatusUpdatedEnabled(Boolean.parseBoolean(body.get("statusUpdatedEnabled").toString()));
        if (body.containsKey("newCommentEnabled")) prefs.setNewCommentEnabled(Boolean.parseBoolean(body.get("newCommentEnabled").toString()));
        if (body.containsKey("csatRequestEnabled")) prefs.setCsatRequestEnabled(Boolean.parseBoolean(body.get("csatRequestEnabled").toString()));

        return ResponseEntity.ok(preferencesRepository.save(prefs));
    }

    // ─── PRIVATE HELPERS ─────────────────────────────────────────────────────
    private User resolveCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private UserNotificationPreferences createDefaultPreferences(User user) {
        UserNotificationPreferences prefs = new UserNotificationPreferences(user);
        return preferencesRepository.save(prefs);
    }
}
