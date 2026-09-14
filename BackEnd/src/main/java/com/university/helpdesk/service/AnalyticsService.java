package com.university.helpdesk.service;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.FeedbackRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final TicketRepository ticketRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    public AnalyticsService(TicketRepository ticketRepository,
                            FeedbackRepository feedbackRepository,
                            UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    // ─── SUMMARY METRICS ─────────────────────────────────────────────────────
    public Map<String, Object> getSummary() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<Feedback> feedbacks = feedbackRepository.findAll();

        long totalTickets = tickets.size();

        long openTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.OPEN || t.getStatus() == Status.REOPENED)
                .count();

        long inProgressTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.IN_PROGRESS)
                .count();

        long resolvedTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.RESOLVED || t.getStatus() == Status.CLOSED)
                .count();

        // Calculate average resolution time in hours
        double avgResolutionHours = 0.0;
        List<Ticket> resolvedList = tickets.stream()
                .filter(t -> (t.getStatus() == Status.RESOLVED || t.getStatus() == Status.CLOSED) && t.getResolvedAt() != null && t.getCreatedAt() != null)
                .toList();

        if (!resolvedList.isEmpty()) {
            long totalMinutes = resolvedList.stream()
                    .mapToLong(t -> Math.max(0, Duration.between(t.getCreatedAt(), t.getResolvedAt()).toMinutes()))
                    .sum();
            avgResolutionHours = Math.round((totalMinutes / 60.0 / resolvedList.size()) * 10.0) / 10.0;
        }

        // CSAT average out of 5 & satisfaction percentage
        double avgCsatRating = 0.0;
        double satisfactionRatePercentage = 0.0;

        if (!feedbacks.isEmpty()) {
            double totalRating = feedbacks.stream().mapToInt(Feedback::getRating).sum();
            avgCsatRating = Math.round((totalRating / feedbacks.size()) * 10.0) / 10.0;
            satisfactionRatePercentage = Math.round((avgCsatRating / 5.0) * 100.0);
        }

        // Category distribution
        Map<String, Long> categoryDistribution = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> (t.getCategory() != null ? t.getCategory().getName() : (t.getDepartment() != null ? t.getDepartment() : "General IT")),
                        Collectors.counting()
                ));

        // Priority distribution
        Map<String, Long> priorityDistribution = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getPriority() != null ? t.getPriority().name() : "MEDIUM",
                        Collectors.counting()
                ));

        // Status distribution
        Map<String, Long> statusDistribution = tickets.stream()
                .collect(Collectors.groupingBy(
                        t -> t.getStatus() != null ? t.getStatus().name() : "OPEN",
                        Collectors.counting()
                ));

        Map<String, Object> summary = new HashMap<>();
        summary.put("totalTickets", totalTickets);
        summary.put("openTickets", openTickets);
        summary.put("inProgressTickets", inProgressTickets);
        summary.put("resolvedTickets", resolvedTickets);
        summary.put("avgResolutionTimeHours", avgResolutionHours);
        summary.put("avgCsatRating", avgCsatRating);
        summary.put("satisfactionRatePercentage", satisfactionRatePercentage);
        summary.put("totalFeedbackCount", feedbacks.size());
        summary.put("categoryDistribution", categoryDistribution);
        summary.put("priorityDistribution", priorityDistribution);
        summary.put("statusDistribution", statusDistribution);

        return summary;
    }

    // ─── AGENT PERFORMANCE ──────────────────────────────────────────────────
    public List<Map<String, Object>> getAgentPerformance() {
        List<User> agents = userRepository.findAll().stream()
                .filter(u -> u.getRole() == Role.SUPPORT_AGENT || u.getRole() == Role.DEPARTMENT_MANAGER || u.getRole() == Role.ADMIN)
                .toList();

        List<Ticket> allTickets = ticketRepository.findAll();
        List<Feedback> allFeedbacks = feedbackRepository.findAll();

        List<Map<String, Object>> result = new ArrayList<>();

        for (User agent : agents) {
            List<Ticket> assigned = allTickets.stream()
                    .filter(t -> t.getAssignedTo() != null && Objects.equals(t.getAssignedTo().getId(), agent.getId()))
                    .toList();

            long resolvedCount = assigned.stream()
                    .filter(t -> t.getStatus() == Status.RESOLVED || t.getStatus() == Status.CLOSED)
                    .count();

            Set<Long> assignedTicketIds = assigned.stream().map(Ticket::getId).collect(Collectors.toSet());
            List<Feedback> agentFeedbacks = allFeedbacks.stream()
                    .filter(f -> f.getTicket() != null && assignedTicketIds.contains(f.getTicket().getId()))
                    .toList();

            double avgRating = 0.0;
            if (!agentFeedbacks.isEmpty()) {
                double sum = agentFeedbacks.stream().mapToInt(Feedback::getRating).sum();
                avgRating = Math.round((sum / agentFeedbacks.size()) * 10.0) / 10.0;
            }

            Map<String, Object> item = new HashMap<>();
            item.put("agentId", agent.getId());
            item.put("agentName", agent.getFullName() != null ? agent.getFullName() : agent.getUsername());
            item.put("email", agent.getEmail());
            item.put("department", agent.getDepartment() != null ? agent.getDepartment() : "IT Support");
            item.put("role", agent.getRole().name());
            item.put("assignedTicketsCount", assigned.size());
            item.put("resolvedTicketsCount", resolvedCount);
            item.put("avgCsatRating", avgRating);
            item.put("feedbackCount", agentFeedbacks.size());

            result.add(item);
        }

        // Sort by resolved tickets count descending
        result.sort((a, b) -> Long.compare((Long) b.get("resolvedTicketsCount"), (Long) a.get("resolvedTicketsCount")));
        return result;
    }

    // ─── CSV REPORT GENERATION ───────────────────────────────────────────────
    public String generateCsvReport() {
        List<Ticket> tickets = ticketRepository.findAll();
        StringBuilder csv = new StringBuilder();

        // CSV Header
        csv.append("Ticket Number,Title,Category,Priority,Status,Location,Department,Created By,Assigned To,Created At,Resolved At,Resolution Notes\n");

        DateTimeFormatter fmt = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm");

        for (Ticket t : tickets) {
            csv.append(escapeCsv(t.getTicketNumber())).append(",");
            csv.append(escapeCsv(t.getTitle())).append(",");
            csv.append(escapeCsv(t.getCategory() != null ? t.getCategory().getName() : "General")).append(",");
            csv.append(escapeCsv(t.getPriority() != null ? t.getPriority().name() : "MEDIUM")).append(",");
            csv.append(escapeCsv(t.getStatus() != null ? t.getStatus().name() : "OPEN")).append(",");
            csv.append(escapeCsv(t.getLocation())).append(",");
            csv.append(escapeCsv(t.getDepartment())).append(",");
            csv.append(escapeCsv(t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : "N/A")).append(",");
            csv.append(escapeCsv(t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "Unassigned")).append(",");
            csv.append(escapeCsv(t.getCreatedAt() != null ? t.getCreatedAt().format(fmt) : "")).append(",");
            csv.append(escapeCsv(t.getResolvedAt() != null ? t.getResolvedAt().format(fmt) : "")).append(",");
            csv.append(escapeCsv(t.getResolutionNotes())).append("\n");
        }

        return csv.toString();
    }

    private String escapeCsv(String value) {
        if (value == null) return "\"\"";
        String escaped = value.replace("\"", "\"\"");
        return "\"" + escaped + "\"";
    }
}
