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
@CrossOrigin(origins = "*")
public class AnalyticsController {

    private final AnalyticsService analyticsService;

    public AnalyticsController(AnalyticsService analyticsService) {
        this.analyticsService = analyticsService;
    }

    // ─── GET SUMMARY METRICS (Managers, Admins, and Support Agents) ────────────
    @GetMapping("/summary")
    @PreAuthorize("hasAnyRole('DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR', 'SUPPORT_AGENT')")
    public ResponseEntity<Map<String, Object>> getSummary() {
        return ResponseEntity.ok(analyticsService.getSummary());
    }

    // ─── GET AGENT PERFORMANCE (Department Managers & Admins only) ────────────
    @GetMapping("/agent-performance")
    @PreAuthorize("hasAnyRole('DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Map<String, Object>>> getAgentPerformance() {
        return ResponseEntity.ok(analyticsService.getAgentPerformance());
    }

    // ─── EXPORT CSV REPORT (Department Managers & Admins only) ────────────────
    @GetMapping(value = "/export/csv", produces = "text/csv")
    @PreAuthorize("hasAnyRole('DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<String> exportCsvReport() {
        String csvData = analyticsService.generateCsvReport();

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"university_helpdesk_report.csv\"")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(csvData);
    }
}
