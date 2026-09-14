package com.university.helpdesk.controller;

import com.university.helpdesk.model.Notification;
import com.university.helpdesk.repository.NotificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/notifications")
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    public NotificationController(NotificationRepository notificationRepository) {
        this.notificationRepository = notificationRepository;
    }

    // ─── GET NOTIFICATIONS FOR USER ──────────────────────────────────────────
    @GetMapping
    public ResponseEntity<Map<String, Object>> getUserNotifications(@RequestParam Long userId) {
        List<Notification> list = notificationRepository.findByRecipientIdOrderByCreatedAtDesc(userId);
        long unreadCount = notificationRepository.countByRecipientIdAndIsReadFalse(userId);

        Map<String, Object> result = new HashMap<>();
        result.put("notifications", list);
        result.put("unreadCount", unreadCount);
        return ResponseEntity.ok(result);
    }

    // ─── MARK SINGLE AS READ ──────────────────────────────────────────────────
    @PutMapping("/{id}/read")
    public ResponseEntity<Notification> markAsRead(@PathVariable Long id) {
        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        notification.setRead(true);
        Notification saved = notificationRepository.save(notification);
        return ResponseEntity.ok(saved);
    }

    // ─── MARK ALL AS READ FOR USER ────────────────────────────────────────────
    @PutMapping("/read-all")
    public ResponseEntity<Map<String, Object>> markAllAsRead(@RequestParam Long userId) {
        notificationRepository.markAllAsReadForUser(userId);
        return ResponseEntity.ok(Map.of("success", true, "message", "All notifications marked as read."));
    }

    // ─── DELETE NOTIFICATION ─────────────────────────────────────────────────
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long id) {
        if (!notificationRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        notificationRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
