package com.university.helpdesk.controller;

import com.university.helpdesk.dto.AgentActivityLogDTO;
import com.university.helpdesk.dto.AnalyticsInsightDTO;
import com.university.helpdesk.model.AgentActivityAction;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.AgentActivityLogService;
import com.university.helpdesk.service.AnalyticsInsightService;
import com.university.helpdesk.service.AnalyticsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;
    private final AgentActivityLogService agentActivityLogService;
    private final AnalyticsInsightService analyticsInsightService;
    private final UserRepository userRepository;

    public AnalyticsController(AnalyticsService analyticsService,
                               AgentActivityLogService agentActivityLogService,
                               AnalyticsInsightService analyticsInsightService,
                               UserRepository userRepository) {
        this.analyticsService = analyticsService;
        this.agentActivityLogService = agentActivityLogService;
        this.analyticsInsightService = analyticsInsightService;
        this.userRepository = userRepository;
    }

    private User getCurrentUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Not authenticated");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    // ─── GET SUMMARY METRICS (Managers, Team Leads, and Admins) ──────────────
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(analyticsService.getSummary());
    }

    // ─── GET AGENT PERFORMANCE (Team Leads, Managers & Admins) ────────────────
    @GetMapping("/agent-performance")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Map<String, Object>>> getAgentPerformance() {
        return ResponseEntity.ok(analyticsService.getAgentPerformance());
    }

    // ─── GET SLA COMPLIANCE (Managers & Admins) ────────────────────────────────
    @GetMapping("/sla-compliance")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getSlaCompliance() {
        return ResponseEntity.ok(analyticsService.getSlaCompliance());
    }

    // ─── EXPORT CSV REPORT (Managers & Admins only) ───────────────────────────
    @GetMapping(value = "/export/csv", produces = "text/csv")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<String> exportCsvReport() {
        String csvData = analyticsService.generateCsvReport();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"university_helpdesk_report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }

    // ─── GET AGENT ACTIVITY LOGS (Managers & Admins) ─────────────────────────
    @GetMapping("/activity-logs")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<AgentActivityLogDTO>> getActivityLogs(
            @RequestParam(required = false) Long agentId,
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String action,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        LocalDateTime from = dateFrom != null && !dateFrom.isBlank()
                ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        LocalDateTime to = dateTo != null && !dateTo.isBlank()
                ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;
        AgentActivityAction act = null;
        if (action != null && !action.isBlank()) {
            try {
                act = AgentActivityAction.valueOf(action.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }
        return ResponseEntity.ok(agentActivityLogService.getActivityLogs(agentId, department, act, from, to));
    }

    // ─── GET AGENT ACTIVITY SUMMARY (Managers & Admins) ──────────────────────
    @GetMapping("/activity-summary")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getActivitySummary(
            @RequestParam(required = false) String department,
            @RequestParam(required = false) String dateFrom,
            @RequestParam(required = false) String dateTo) {
        LocalDateTime from = dateFrom != null && !dateFrom.isBlank()
                ? LocalDate.parse(dateFrom).atStartOfDay() : null;
        LocalDateTime to = dateTo != null && !dateTo.isBlank()
                ? LocalDate.parse(dateTo).atTime(23, 59, 59) : null;
        return ResponseEntity.ok(agentActivityLogService.getActivitySummary(department, from, to));
    }

    // ─── GET INSIGHTS (Managers & Admins) ────────────────────────────────────
    @GetMapping("/insights")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<AnalyticsInsightDTO>> getInsights() {
        return ResponseEntity.ok(analyticsInsightService.getInsights());
    }

    // ─── CREATE INSIGHT (Managers & Admins) ──────────────────────────────────
    @PostMapping("/insights")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<AnalyticsInsightDTO> createInsight(@RequestBody Map<String, String> body,
                                                             Authentication auth) {
        User currentUser = getCurrentUser(auth);
        String title = body != null ? body.get("title") : null;
        String content = body != null ? body.get("content") : null;
        AnalyticsInsightDTO created = analyticsInsightService.createInsight(title, content, currentUser);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    // ─── UPDATE INSIGHT (Author or System Admin) ─────────────────────────────
    @PutMapping("/insights/{id}")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<AnalyticsInsightDTO> updateInsight(@PathVariable Long id,
                                                             @RequestBody Map<String, String> body,
                                                             Authentication auth) {
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        String title = body != null ? body.get("title") : null;
        String content = body != null ? body.get("content") : null;
        AnalyticsInsightDTO updated = analyticsInsightService.updateInsight(id, title, content, currentUser, isAdmin);
        return ResponseEntity.ok(updated);
    }

    // ─── DELETE INSIGHT (Author or System Admin) ─────────────────────────────
    @DeleteMapping("/insights/{id}")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteInsight(@PathVariable Long id, Authentication auth) {
        User currentUser = getCurrentUser(auth);
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        analyticsInsightService.deleteInsight(id, currentUser, isAdmin);
        return ResponseEntity.noContent().build();
    }
}
