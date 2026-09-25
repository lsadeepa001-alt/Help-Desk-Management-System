package com.university.helpdesk.dto;

import com.university.helpdesk.model.AssignmentAction;
import com.university.helpdesk.model.TicketAssignmentHistory;
import java.time.LocalDateTime;

/**
 * Safe view-only DTO for ticket assignment history.
 * Omits internal entity references in favour of safe display fields.
 */
public class AssignmentHistoryDTO {

    private Long id;
    private AssignmentAction action;
    private String previousAgentName;
    private String newAgentName;
    private String previousDepartment;
    private String newDepartment;
    private String changedByName;
    private String changedByRole;
    private LocalDateTime changedAt;

    public AssignmentHistoryDTO() {}

    public static AssignmentHistoryDTO from(TicketAssignmentHistory h) {
        AssignmentHistoryDTO dto = new AssignmentHistoryDTO();
        dto.id = h.getId();
        dto.action = h.getAction();
        dto.previousDepartment = h.getPreviousDepartment();
        dto.newDepartment = h.getNewDepartment();
        dto.changedAt = h.getChangedAt();

        if (h.getPreviousAgent() != null) {
            dto.previousAgentName = h.getPreviousAgent().getFullName() != null
                    ? h.getPreviousAgent().getFullName()
                    : h.getPreviousAgent().getUsername();
        }
        if (h.getNewAgent() != null) {
            dto.newAgentName = h.getNewAgent().getFullName() != null
                    ? h.getNewAgent().getFullName()
                    : h.getNewAgent().getUsername();
        }
        if (h.getChangedBy() != null) {
            dto.changedByName = h.getChangedBy().getFullName() != null
                    ? h.getChangedBy().getFullName()
                    : h.getChangedBy().getUsername();
            dto.changedByRole = h.getChangedBy().getRole() != null
                    ? h.getChangedBy().getRole().name()
                    : null;
        }

        return dto;
    }

    // Getters
    public Long getId() { return id; }
    public AssignmentAction getAction() { return action; }
    public String getPreviousAgentName() { return previousAgentName; }
    public String getNewAgentName() { return newAgentName; }
    public String getPreviousDepartment() { return previousDepartment; }
    public String getNewDepartment() { return newDepartment; }
    public String getChangedByName() { return changedByName; }
    public String getChangedByRole() { return changedByRole; }
    public LocalDateTime getChangedAt() { return changedAt; }
}
