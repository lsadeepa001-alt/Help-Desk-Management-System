package com.university.helpdesk.model;

public enum Status {
    OPEN,
    @Deprecated
    ACCEPTED,
    IN_PROGRESS,
    RESOLVED,
    CLOSED,
    REOPENED,
    CANCELLED,
    REJECTED
}
