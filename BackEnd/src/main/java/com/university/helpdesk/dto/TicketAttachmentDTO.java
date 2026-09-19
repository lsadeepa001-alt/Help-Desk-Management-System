package com.university.helpdesk.dto;

import com.university.helpdesk.model.TicketAttachment;
import java.time.LocalDateTime;

public class TicketAttachmentDTO {
    private Long id;
    private Long ticketId;
    private String originalFileName;
    private String storedFileName;
    private String contentType;
    private Long fileSize;
    private LocalDateTime uploadedAt;
    private Long uploadedById;
    private String uploadedByName;

    public TicketAttachmentDTO() {}

    public TicketAttachmentDTO(TicketAttachment attachment) {
        this.id = attachment.getId();
        this.ticketId = attachment.getTicketId();
        this.originalFileName = attachment.getOriginalFileName();
        this.storedFileName = attachment.getStoredFileName();
        this.contentType = attachment.getContentType();
        this.fileSize = attachment.getFileSize();
        this.uploadedAt = attachment.getUploadedAt();
        if (attachment.getUploadedBy() != null) {
            this.uploadedById = attachment.getUploadedBy().getId();
            this.uploadedByName = attachment.getUploadedBy().getFullName() != null
                    ? attachment.getUploadedBy().getFullName()
                    : attachment.getUploadedBy().getUsername();
        }
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Long getTicketId() { return ticketId; }
    public void setTicketId(Long ticketId) { this.ticketId = ticketId; }

    public String getOriginalFileName() { return originalFileName; }
    public void setOriginalFileName(String originalFileName) { this.originalFileName = originalFileName; }

    public String getStoredFileName() { return storedFileName; }
    public void setStoredFileName(String storedFileName) { this.storedFileName = storedFileName; }

    public String getContentType() { return contentType; }
    public void setContentType(String contentType) { this.contentType = contentType; }

    public Long getFileSize() { return fileSize; }
    public void setFileSize(Long fileSize) { this.fileSize = fileSize; }

    public LocalDateTime getUploadedAt() { return uploadedAt; }
    public void setUploadedAt(LocalDateTime uploadedAt) { this.uploadedAt = uploadedAt; }

    public Long getUploadedById() { return uploadedById; }
    public void setUploadedById(Long uploadedById) { this.uploadedById = uploadedById; }

    public String getUploadedByName() { return uploadedByName; }
    public void setUploadedByName(String uploadedByName) { this.uploadedByName = uploadedByName; }
}
