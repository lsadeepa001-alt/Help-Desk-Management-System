package com.university.helpdesk.service;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.FeedbackRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.stream.Collectors;

@Service
public class AnalyticsService {

    private final TicketRepository ticketRepository;
    private final FeedbackRepository feedbackRepository;
    private final UserRepository userRepository;

    @Value("${app.sla.threshold.low:72}")
    private long slaThresholdLow = 72;

    @Value("${app.sla.threshold.medium:48}")
    private long slaThresholdMedium = 48;

    @Value("${app.sla.threshold.high:24}")
    private long slaThresholdHigh = 24;

    @Value("${app.sla.threshold.urgent:8}")
    private long slaThresholdUrgent = 8;

    @Value("${app.sla.threshold.critical:4}")
    private long slaThresholdCritical = 4;

    public AnalyticsService(TicketRepository ticketRepository,
                            FeedbackRepository feedbackRepository,
                            UserRepository userRepository) {
        this.ticketRepository = ticketRepository;
        this.feedbackRepository = feedbackRepository;
        this.userRepository = userRepository;
    }

    public long getThresholdHours(Priority priority) {
        if (priority == null) return slaThresholdMedium;
        return switch (priority) {
            case LOW -> slaThresholdLow;
            case MEDIUM -> slaThresholdMedium;
            case HIGH -> slaThresholdHigh;
            case URGENT -> slaThresholdUrgent;
            case CRITICAL -> slaThresholdCritical;
        };
    }

    public void setSlaThresholdLow(long slaThresholdLow) { this.slaThresholdLow = slaThresholdLow; }
    public void setSlaThresholdMedium(long slaThresholdMedium) { this.slaThresholdMedium = slaThresholdMedium; }
    public void setSlaThresholdHigh(long slaThresholdHigh) { this.slaThresholdHigh = slaThresholdHigh; }
    public void setSlaThresholdUrgent(long slaThresholdUrgent) { this.slaThresholdUrgent = slaThresholdUrgent; }
    public void setSlaThresholdCritical(long slaThresholdCritical) { this.slaThresholdCritical = slaThresholdCritical; }


    // ─── SUMMARY METRICS ─────────────────────────────────────────────────────
    public Map<String, Object> getSummary() {
        List<Ticket> tickets = ticketRepository.findAll();
        List<Feedback> feedbacks = feedbackRepository.findAll();

        long totalTickets = tickets.size();

        long openTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.OPEN)
                .count();

        long acceptedTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.ACCEPTED)
                .count();

        long inProgressTickets = tickets.stream()
                .filter(t -> t.getStatus() == Status.IN_PROGRESS || t.getStatus() == Status.REOPENED)
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

        // CSAT: avgRating = arithmetic average out of 5; csatScore = % of ratings >= 4
        double avgCsatRating = 0.0;
        double satisfactionRatePercentage = 0.0;

        if (!feedbacks.isEmpty()) {
            double totalRating = feedbacks.stream().mapToInt(Feedback::getRating).sum();
            avgCsatRating = Math.round((totalRating / feedbacks.size()) * 10.0) / 10.0;
            long satisfiedCount = feedbacks.stream().filter(f -> f.getRating() >= 4).count();
            satisfactionRatePercentage = Math.round(((double) satisfiedCount / feedbacks.size()) * 100.0);
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
        summary.put("acceptedTickets", acceptedTickets);
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
        List<User> agents = userRepository.findByRole(Role.SUPPORT_AGENT);

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

    // ─── SLA COMPLIANCE ──────────────────────────────────────────────────────
    public Map<String, Object> getSlaCompliance() {
        List<Ticket> allTickets = ticketRepository.findAll();

        long totalMeasuredTickets = 0;
        long slaMetCount = 0;
        long slaBreachedCount = 0;

        Map<Priority, Long> priorityTotals = new EnumMap<>(Priority.class);
        Map<Priority, Long> priorityMets = new EnumMap<>(Priority.class);
        Map<Priority, Long> priorityBreached = new EnumMap<>(Priority.class);

        for (Priority p : Priority.values()) {
            priorityTotals.put(p, 0L);
            priorityMets.put(p, 0L);
            priorityBreached.put(p, 0L);
        }

        LocalDateTime now = LocalDateTime.now();

        for (Ticket ticket : allTickets) {
            Status status = ticket.getStatus();
            if (status == Status.CANCELLED || status == Status.REJECTED) {
                continue;
            }

            Priority priority = ticket.getPriority() != null ? ticket.getPriority() : Priority.MEDIUM;
            long thresholdHours = getThresholdHours(priority);
            long thresholdMinutes = thresholdHours * 60;

            LocalDateTime createdAt = ticket.getCreatedAt() != null ? ticket.getCreatedAt() : now;

            boolean isMet;
            if (status == Status.RESOLVED || status == Status.CLOSED) {
                LocalDateTime resolvedAt = ticket.getResolvedAt() != null ? ticket.getResolvedAt() :
                        (ticket.getUpdatedAt() != null ? ticket.getUpdatedAt() : now);
                long elapsedMinutes = Math.max(0, Duration.between(createdAt, resolvedAt).toMinutes());
                isMet = elapsedMinutes <= thresholdMinutes;
            } else {
                long elapsedMinutes = Math.max(0, Duration.between(createdAt, now).toMinutes());
                isMet = elapsedMinutes <= thresholdMinutes;
            }

            totalMeasuredTickets++;
            priorityTotals.put(priority, priorityTotals.get(priority) + 1);

            if (isMet) {
                slaMetCount++;
                priorityMets.put(priority, priorityMets.get(priority) + 1);
            } else {
                slaBreachedCount++;
                priorityBreached.put(priority, priorityBreached.get(priority) + 1);
            }
        }

        Map<String, Object> perPriority = new LinkedHashMap<>();
        for (Priority p : Priority.values()) {
            long pTotal = priorityTotals.get(p);
            long pMet = priorityMets.get(p);
            long pBreached = priorityBreached.get(p);
            double pCompliance = pTotal == 0 ? 0.0 : Math.round(((double) pMet / pTotal) * 1000.0) / 10.0;

            Map<String, Object> item = new LinkedHashMap<>();
            item.put("thresholdHours", getThresholdHours(p));
            item.put("total", pTotal);
            item.put("met", pMet);
            item.put("breached", pBreached);
            item.put("compliancePercentage", pCompliance);

            perPriority.put(p.name(), item);
        }

        double compliancePercentage = totalMeasuredTickets == 0 ? 0.0 :
                Math.round(((double) slaMetCount / totalMeasuredTickets) * 1000.0) / 10.0;

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("totalMeasuredTickets", totalMeasuredTickets);
        result.put("slaMetCount", slaMetCount);
        result.put("slaBreachedCount", slaBreachedCount);
        result.put("compliancePercentage", compliancePercentage);
        result.put("perPriority", perPriority);

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
