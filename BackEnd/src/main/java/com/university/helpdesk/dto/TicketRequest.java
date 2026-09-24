package com.university.helpdesk.dto;

import com.university.helpdesk.model.Priority;
import jakarta.validation.constraints.NotBlank;

public class TicketRequest {

    @NotBlank(message = "Title is required")
    private String title;

    @NotBlank(message = "Description is required")
    private String description;

    @NotBlank(message = "Department is required. Allowed values: IT, Maintenance, Security")
    private String department;

    private Priority priority;

    private String location;

    private Long categoryId;

    private String ticketNumber;

    public TicketRequest() {}

    public TicketRequest(String title, String description, String department, Priority priority, String location, Long categoryId, String ticketNumber) {
        this.title = title;
        this.description = description;
        this.department = department;
        this.priority = priority;
        this.location = location;
        this.categoryId = categoryId;
        this.ticketNumber = ticketNumber;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getDescription() {
        return description;
    }

    public void setDescription(String description) {
        this.description = description;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public Priority getPriority() {
        return priority;
    }

    public void setPriority(Priority priority) {
        this.priority = priority;
    }

    public String getLocation() {
        return location;
    }

    public void setLocation(String location) {
        this.location = location;
    }

    public Long getCategoryId() {
        return categoryId;
    }

    public void setCategoryId(Long categoryId) {
        this.categoryId = categoryId;
    }

    public String getTicketNumber() {
        return ticketNumber;
    }

    public void setTicketNumber(String ticketNumber) {
        this.ticketNumber = ticketNumber;
    }
}
