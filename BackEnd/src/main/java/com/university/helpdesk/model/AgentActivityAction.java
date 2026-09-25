package com.university.helpdesk.model;

/**
 * Enumeration of auditable actions performed on tickets by operational staff.
 */
public enum AgentActivityAction {
    TICKET_ASSIGNED,
    TICKET_REASSIGNED,
    TICKET_CLAIMED,
    TICKET_ROUTED,
    TICKET_REROUTED,
    STATUS_CHANGED,
    TICKET_RESOLVED,
    TICKET_REOPENED,
    PUBLIC_COMMENT_ADDED,
    INTERNAL_NOTE_ADDED
}
