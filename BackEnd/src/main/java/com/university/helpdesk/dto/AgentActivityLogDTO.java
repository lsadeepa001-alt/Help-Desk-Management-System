package com.university.helpdesk.dto;

import com.university.helpdesk.model.AgentActivityAction;
import com.university.helpdesk.model.AgentActivityLog;
import com.university.helpdesk.model.Role;

import java.time.LocalDateTime;

public class AgentActivityLogDTO {

    private Long id;
    private Long ticketId;
    private String ticketNumber;
    private String ticketTitle;
    private Long actorId;
    private String actorName;
    private Role actorRole;
    private String actorDepartment;
    private AgentActivityAction action;
    private String details;
    private LocalDateTime createdAt;

    public AgentActivityLogDTO() {}

    public static AgentActivityLogDTO from(AgentActivityLog log) {
        if (log == null) return null;
        AgentActivityLogDTO dto = new AgentActivityLogDTO();
        dto.setId(log.getId());
        if (log.getTicket() != null) {
            dto.setTicketId(log.getTicket().getId());
            dto.setTicketNumber(log.getTicket().getTicketNumber());
            dto.setTicketTitle(log.getTicket().getTitle());
        }
        if (log.getActor() != null) {
            dto.setActorId(log.getActor().getId());
        }
        dto.setActorName(log.getActorName());
        dto.setActorRole(log.getActorRole());
        dto.setActorDepartment(log.getActorDepartment());
        dto.setAction(log.getAction());
        dto.setDetails(log.getDetails());
        dto.setCreatedAt(log.getCreatedAt());
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getTicketId() {
        return ticketId;
    }

    public void setTicketId(Long ticketId) {
        this.ticketId = ticketId;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }

    public String getTicketTitle() {
        return ticketTitle;
    }

    public void setTicketTitle(String ticketTitle) {
        this.ticketTitle = ticketTitle;
    }

    public Long getActorId() {
        return actorId;
    }

    public void setActorId(Long actorId) {
        this.actorId = actorId;
    }

    public String getActorName() {
        return actorName;
    }

    public void setActorName(String actorName) {
        this.actorName = actorName;
    }

    public Role getActorRole() {
        return actorRole;
    }

    public void setActorRole(Role actorRole) {
        this.actorRole = actorRole;
    }

    public String getActorDepartment() {
        return actorDepartment;
    }

    public void setActorDepartment(String actorDepartment) {
        this.actorDepartment = actorDepartment;
    }

    public AgentActivityAction getAction() {
        return action;
    }

    public void setAction(AgentActivityAction action) {
        this.action = action;
    }

    public String getDetails() {
        return details;
    }

    public void setDetails(String details) {
        this.details = details;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }
}
