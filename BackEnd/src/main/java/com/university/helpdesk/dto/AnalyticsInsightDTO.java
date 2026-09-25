package com.university.helpdesk.dto;

import com.university.helpdesk.model.AnalyticsInsight;
import com.university.helpdesk.model.Role;

import java.time.LocalDateTime;

public class AnalyticsInsightDTO {

    private Long id;
    private Long authorId;
    private String authorName;
    private Role authorRole;
    private String department;
    private String title;
    private String content;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private boolean edited;

    public AnalyticsInsightDTO() {}

    public static AnalyticsInsightDTO from(AnalyticsInsight entity) {
        if (entity == null) return null;
        AnalyticsInsightDTO dto = new AnalyticsInsightDTO();
        dto.setId(entity.getId());
        if (entity.getAuthor() != null) {
            dto.setAuthorId(entity.getAuthor().getId());
        }
        dto.setAuthorName(entity.getAuthorName());
        dto.setAuthorRole(entity.getAuthorRole());
        dto.setDepartment(entity.getDepartment());
        dto.setTitle(entity.getTitle());
        dto.setContent(entity.getContent());
        dto.setCreatedAt(entity.getCreatedAt());
        dto.setUpdatedAt(entity.getUpdatedAt());
        dto.setEdited(entity.getUpdatedAt() != null && entity.getCreatedAt() != null
                && !entity.getUpdatedAt().isEqual(entity.getCreatedAt()));
        return dto;
    }

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public Long getAuthorId() {
        return authorId;
    }

    public void setAuthorId(Long authorId) {
        this.authorId = authorId;
    }

    public String getAuthorName() {
        return authorName;
    }

    public void setAuthorName(String authorName) {
        this.authorName = authorName;
    }

    public Role getAuthorRole() {
        return authorRole;
    }

    public void setAuthorRole(Role authorRole) {
        this.authorRole = authorRole;
    }

    public String getDepartment() {
        return department;
    }

    public void setDepartment(String department) {
        this.department = department;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getContent() {
        return content;
    }

    public void setContent(String content) {
        this.content = content;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(LocalDateTime createdAt) {
        this.createdAt = createdAt;
    }

    public LocalDateTime getUpdatedAt() {
        return updatedAt;
    }

    public void setUpdatedAt(LocalDateTime updatedAt) {
        this.updatedAt = updatedAt;
    }

    public boolean isEdited() {
        return edited;
    }

    public void setEdited(boolean edited) {
        this.edited = edited;
    }
}
