package com.university.helpdesk.service;

import com.university.helpdesk.dto.AgentActivityLogDTO;
import com.university.helpdesk.model.AgentActivityAction;
import com.university.helpdesk.model.AgentActivityLog;
import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.AgentActivityLogRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@Transactional
public class AgentActivityLogService {

    private final AgentActivityLogRepository agentActivityLogRepository;

    public AgentActivityLogService(AgentActivityLogRepository agentActivityLogRepository) {
        this.agentActivityLogRepository = agentActivityLogRepository;
    }

    public AgentActivityLog logActivity(User actor, Ticket ticket, AgentActivityAction action, String details) {
        if (ticket == null || action == null) {
            return null;
        }

        try {
            AgentActivityLog log = new AgentActivityLog();
            log.setTicket(ticket);
            log.setActor(actor);
            if (actor != null) {
                log.setActorName(actor.getFullName() != null && !actor.getFullName().isBlank()
                        ? actor.getFullName() : actor.getUsername());
                log.setActorRole(actor.getRole());
                log.setActorDepartment(actor.getDepartment() != null ? actor.getDepartment() : ticket.getDepartment());
            } else {
                log.setActorName("System");
                log.setActorDepartment(ticket.getDepartment());
            }
            log.setAction(action);
            if (details != null && details.length() > 1000) {
                log.setDetails(details.substring(0, 1000));
            } else {
                log.setDetails(details);
            }
            log.setCreatedAt(LocalDateTime.now());
            return agentActivityLogRepository.save(log);
        } catch (Exception e) {
            System.err.println("Failed to record agent activity log: " + e.getMessage());
            return null;
        }
    }

    @Transactional(readOnly = true)
    public List<AgentActivityLogDTO> getActivityLogs(Long agentId,
                                                     String department,
                                                     AgentActivityAction action,
                                                     LocalDateTime from,
                                                     LocalDateTime to) {
        List<AgentActivityLog> logs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();

        return logs.stream()
                .filter(l -> agentId == null || (l.getActor() != null && agentId.equals(l.getActor().getId())))
                .filter(l -> department == null || department.isBlank() ||
                        (l.getActorDepartment() != null && l.getActorDepartment().equalsIgnoreCase(department.trim())) ||
                        (l.getTicket() != null && l.getTicket().getDepartment() != null && l.getTicket().getDepartment().equalsIgnoreCase(department.trim())))
                .filter(l -> action == null || l.getAction() == action)
                .filter(l -> from == null || (l.getCreatedAt() != null && !l.getCreatedAt().isBefore(from)))
                .filter(l -> to == null || (l.getCreatedAt() != null && !l.getCreatedAt().isAfter(to)))
                .map(AgentActivityLogDTO::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public Map<String, Object> getActivitySummary(String department,
                                                  LocalDateTime from,
                                                  LocalDateTime to) {
        List<AgentActivityLog> logs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();

        List<AgentActivityLog> filtered = logs.stream()
                .filter(l -> department == null || department.isBlank() ||
                        (l.getActorDepartment() != null && l.getActorDepartment().equalsIgnoreCase(department.trim())) ||
                        (l.getTicket() != null && l.getTicket().getDepartment() != null && l.getTicket().getDepartment().equalsIgnoreCase(department.trim())))
                .filter(l -> from == null || (l.getCreatedAt() != null && !l.getCreatedAt().isBefore(from)))
                .filter(l -> to == null || (l.getCreatedAt() != null && !l.getCreatedAt().isAfter(to)))
                .toList();

        long totalActivities = filtered.size();

        Map<String, Long> byAction = new LinkedHashMap<>();
        for (AgentActivityAction act : AgentActivityAction.values()) {
            byAction.put(act.name(), 0L);
        }
        filtered.forEach(l -> {
            if (l.getAction() != null) {
                byAction.put(l.getAction().name(), byAction.getOrDefault(l.getAction().name(), 0L) + 1);
            }
        });

        Map<String, Long> byDepartment = filtered.stream()
                .map(l -> l.getActorDepartment() != null ? l.getActorDepartment() :
                        (l.getTicket() != null && l.getTicket().getDepartment() != null ? l.getTicket().getDepartment() : "General"))
                .collect(Collectors.groupingBy(d -> d, Collectors.counting()));

        List<AgentActivityLogDTO> recentActivities = filtered.stream()
                .limit(20)
                .map(AgentActivityLogDTO::from)
                .toList();

        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalActivities", totalActivities);
        summary.put("byAction", byAction);
        summary.put("byDepartment", byDepartment);
        summary.put("recentActivities", recentActivities);

        return summary;
    }
}
