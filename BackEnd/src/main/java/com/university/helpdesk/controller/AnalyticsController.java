package com.university.helpdesk.controller;

import com.university.helpdesk.service.AnalyticsService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/analytics")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
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
}
