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

}
