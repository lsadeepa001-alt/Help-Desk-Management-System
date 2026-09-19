package com.university.helpdesk.controller;

import com.university.helpdesk.dto.TicketAttachmentDTO;
import com.university.helpdesk.model.TicketAttachment;
import com.university.helpdesk.service.AttachmentService;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/tickets/{ticketId}/attachments")
@CrossOrigin(origins = "*")
public class AttachmentController {

    private final AttachmentService attachmentService;

    public AttachmentController(AttachmentService attachmentService) {
        this.attachmentService = attachmentService;
    }

    // ─── UPLOAD ATTACHMENTS (Customer or Support Staff) ──────────────────────
    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<TicketAttachmentDTO>> uploadAttachments(
            @PathVariable Long ticketId,
            @RequestParam("files") MultipartFile[] files,
            Authentication auth) {
        List<TicketAttachmentDTO> uploaded = attachmentService.storeAttachments(ticketId, files, auth);
        return ResponseEntity.status(HttpStatus.CREATED).body(uploaded);
    }

    // ─── LIST ATTACHMENTS (Ticket Owner or Support Staff) ────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<TicketAttachmentDTO>> getAttachments(
            @PathVariable Long ticketId,
            Authentication auth) {
        List<TicketAttachmentDTO> attachments = attachmentService.getAttachmentsForTicket(ticketId, auth);
        return ResponseEntity.ok(attachments);
    }

    // ─── DOWNLOAD ATTACHMENT (Ticket Owner or Support Staff) ──────────────────
    @GetMapping("/{attachmentId}/download")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Resource> downloadAttachment(
            @PathVariable Long ticketId,
            @PathVariable Long attachmentId,
            Authentication auth) {
        Map.Entry<Resource, TicketAttachment> entry = attachmentService.loadAttachmentResource(ticketId, attachmentId, auth);
        Resource resource = entry.getKey();
        TicketAttachment attachment = entry.getValue();

        String encodedFileName = URLEncoder.encode(attachment.getOriginalFileName(), StandardCharsets.UTF_8)
                .replaceAll("\\+", "%20");

        MediaType mediaType;
        try {
            mediaType = MediaType.parseMediaType(attachment.getContentType());
        } catch (Exception e) {
            mediaType = MediaType.APPLICATION_OCTET_STREAM;
        }

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + attachment.getOriginalFileName() + "\"; filename*=UTF-8''" + encodedFileName)
                .body(resource);
    }

    // ─── DELETE ATTACHMENT (Owner while OPEN, or Admin) ──────────────────────
    @DeleteMapping("/{attachmentId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteAttachment(
            @PathVariable Long ticketId,
            @PathVariable Long attachmentId,
            Authentication auth) {
        attachmentService.deleteAttachment(ticketId, attachmentId, auth);
        return ResponseEntity.noContent().build();
    }
}
