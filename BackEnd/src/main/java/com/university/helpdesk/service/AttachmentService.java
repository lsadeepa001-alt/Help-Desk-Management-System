package com.university.helpdesk.service;

import com.university.helpdesk.dto.TicketAttachmentDTO;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.Status;
import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.TicketAttachment;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.TicketAttachmentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

import java.io.IOException;
import java.net.MalformedURLException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.util.*;

@Service
public class AttachmentService {

    private final TicketAttachmentRepository attachmentRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    @Value("${app.upload.dir:uploads}")
    private String uploadDirProperty;

    private Path rootStorageLocation;

    private static final long MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

    // Whitelist per proposal and user requirements: images, documents, text; no archives, no executables
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
            "jpg", "jpeg", "png", "gif", "webp",
            "pdf",
            "doc", "docx", "xls", "xlsx", "ppt", "pptx",
            "txt", "csv"
    );

    private static final Set<String> BLOCKED_EXTENSIONS = Set.of(
            "exe", "bat", "cmd", "sh", "bin", "jsp", "asp", "aspx", "php", "js", "vbs", "ps1", "jar",
            "zip", "rar", "7z", "tar", "gz"
    );

    public AttachmentService(TicketAttachmentRepository attachmentRepository,
                             TicketRepository ticketRepository,
                             UserRepository userRepository) {
        this.attachmentRepository = attachmentRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    @PostConstruct
    public void init() {
        try {
            this.rootStorageLocation = Paths.get(uploadDirProperty).toAbsolutePath().normalize();
            Files.createDirectories(this.rootStorageLocation);
        } catch (IOException e) {
            throw new RuntimeException("Could not initialize upload directory at: " + uploadDirProperty, e);
        }
    }

    private User getAuthenticatedUser(Authentication auth) {
        if (auth == null || !auth.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }

    private boolean sameDepartment(String first, String second) {
        return first != null && second != null && first.trim().equalsIgnoreCase(second.trim());
    }

    private void checkViewAccess(Ticket ticket, User currentUser) {
        if (currentUser.getRole() == Role.SYSTEM_ADMINISTRATOR) {
            return;
        }

        if (ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(currentUser.getId())) {
            return;
        }

        if (currentUser.getRole() == Role.SUPPORT_AGENT) {
            if (ticket.getAssignedTo() != null &&
                    ticket.getAssignedTo().getId().equals(currentUser.getId()) &&
                    sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Support Agents can only access attachments for tickets assigned to them in their department");
        }

        if (currentUser.getRole() == Role.TEAM_LEAD) {
            if (sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                return;
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Team Leads can only access attachments for tickets in their department");
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Access denied: You are not authorized to view attachments for this ticket");
    }

    private void checkUploadAccess(Ticket ticket, User currentUser) {
        if (currentUser.getRole() == Role.SYSTEM_ADMINISTRATOR) {
            boolean isCreator = ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(currentUser.getId());
            if (!isCreator) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Administrators cannot routinely upload attachments to other users' tickets");
            }
            if (ticket.getStatus() != Status.OPEN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Attachments can only be uploaded while the ticket is OPEN");
            }
            return;
        }

        boolean isCreator = ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(currentUser.getId());
        if (isCreator) {
            if (ticket.getStatus() != Status.OPEN) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Requesters can only upload attachments while the ticket is OPEN");
            }
            return;
        }

        if (currentUser.getRole() == Role.SUPPORT_AGENT) {
            if (ticket.getAssignedTo() == null ||
                    !ticket.getAssignedTo().getId().equals(currentUser.getId()) ||
                    !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Support Agents can only upload attachments to tickets assigned to them in their department");
            }
            if (ticket.getStatus() != Status.IN_PROGRESS && ticket.getStatus() != Status.REOPENED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Support Agents can only upload attachments while the ticket is active (IN_PROGRESS or REOPENED)");
            }
            return;
        }

        if (currentUser.getRole() == Role.TEAM_LEAD) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Team Leads do not upload attachments; coordination is conducted via comments and notes");
        }

        throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                "Access denied: You are not authorized to upload attachments for this ticket");
    }

    public List<TicketAttachmentDTO> storeAttachments(Long ticketId, MultipartFile[] files, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        checkUploadAccess(ticket, currentUser);

        if (files == null || files.length == 0) {
            return Collections.emptyList();
        }

        List<TicketAttachmentDTO> savedAttachments = new ArrayList<>();

        for (MultipartFile file : files) {
            if (file.isEmpty()) {
                continue;
            }

            if (file.getSize() > MAX_FILE_SIZE_BYTES) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "File '" + file.getOriginalFilename() + "' exceeds maximum allowed size of 10MB");
            }

            String originalFileName = StringUtils.cleanPath(Objects.requireNonNullElse(file.getOriginalFilename(), "unnamed"));

            // Path traversal protection
            if (originalFileName.contains("..") || originalFileName.contains("/") || originalFileName.contains("\\")) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid file name: path traversal characters detected");
            }

            String extension = "";
            int extIndex = originalFileName.lastIndexOf('.');
            if (extIndex > 0) {
                extension = originalFileName.substring(extIndex + 1).toLowerCase();
            }

            if (BLOCKED_EXTENSIONS.contains(extension) || !ALLOWED_EXTENSIONS.contains(extension)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "File type '." + extension + "' is not permitted. Only standard documents, images, and text files are allowed.");
            }

            String storedFileName = UUID.randomUUID().toString() + "_" + originalFileName.replaceAll("[^a-zA-Z0-9._-]", "_");
            Path targetPath = this.rootStorageLocation.resolve(storedFileName).normalize();

            // Guard against directory escape
            if (!targetPath.getParent().equals(this.rootStorageLocation)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot store file outside target directory");
            }

            try {
                Files.copy(file.getInputStream(), targetPath, StandardCopyOption.REPLACE_EXISTING);
            } catch (IOException e) {
                throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Failed to store file on disk: " + e.getMessage());
            }

            TicketAttachment attachment = new TicketAttachment();
            attachment.setTicket(ticket);
            attachment.setUploadedBy(currentUser);
            attachment.setOriginalFileName(originalFileName);
            attachment.setStoredFileName(storedFileName);
            attachment.setContentType(file.getContentType() != null ? file.getContentType() : "application/octet-stream");
            attachment.setFileSize(file.getSize());
            attachment.setStoragePath(targetPath.toString());

            TicketAttachment saved = attachmentRepository.save(attachment);
            savedAttachments.add(new TicketAttachmentDTO(saved));
        }

        return savedAttachments;
    }

    public List<TicketAttachmentDTO> getAttachmentsForTicket(Long ticketId, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        checkViewAccess(ticket, currentUser);

        return attachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticketId)
                .stream()
                .map(TicketAttachmentDTO::new)
                .toList();
    }

    public Map.Entry<Resource, TicketAttachment> loadAttachmentResource(Long ticketId, Long attachmentId, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        checkViewAccess(ticket, currentUser);

        TicketAttachment attachment = attachmentRepository.findByIdAndTicketId(attachmentId, ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found with id " + attachmentId));

        Path filePath = this.rootStorageLocation.resolve(attachment.getStoredFileName()).normalize();
        try {
            Resource resource = new UrlResource(filePath.toUri());
            if (resource.exists() && resource.isReadable()) {
                return new AbstractMap.SimpleImmutableEntry<>(resource, attachment);
            } else {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File not found or unreadable on storage");
            }
        } catch (MalformedURLException e) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "File URL malformed: " + e.getMessage());
        }
    }

    public void deleteAttachment(Long ticketId, Long attachmentId, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        TicketAttachment attachment = attachmentRepository.findByIdAndTicketId(attachmentId, ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attachment not found with id " + attachmentId));

        if (currentUser.getRole() == Role.SYSTEM_ADMINISTRATOR) {
            // Administrative delete/cleanup allowed
        } else if (ticket.getCreatedBy() != null && ticket.getCreatedBy().getId().equals(currentUser.getId())) {
            if (ticket.getStatus() != Status.OPEN) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Ticket creators can only delete attachments while the ticket is OPEN");
            }
            if (attachment.getUploadedBy() == null || !attachment.getUploadedBy().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Ticket creators can only delete attachments they uploaded themselves");
            }
        } else if (currentUser.getRole() == Role.SUPPORT_AGENT) {
            if (ticket.getAssignedTo() == null ||
                    !ticket.getAssignedTo().getId().equals(currentUser.getId()) ||
                    !sameDepartment(ticket.getDepartment(), currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Support Agents can only delete attachments on tickets assigned to them in their department");
            }
            if (ticket.getStatus() != Status.IN_PROGRESS && ticket.getStatus() != Status.REOPENED) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Support Agents can only delete attachments while the ticket is active (IN_PROGRESS or REOPENED)");
            }
            if (attachment.getUploadedBy() == null || !attachment.getUploadedBy().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Support Agents can only delete attachments that they uploaded themselves");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You are not authorized to delete this attachment");
        }

        // Delete physical file
        Path filePath = this.rootStorageLocation.resolve(attachment.getStoredFileName()).normalize();
        try {
            Files.deleteIfExists(filePath);
        } catch (IOException e) {
            System.err.println("Warning: failed to delete physical file: " + filePath + " (" + e.getMessage() + ")");
        }

        attachmentRepository.delete(attachment);
    }

    public void deletePhysicalFiles(Collection<TicketAttachment> attachments) {
        for (TicketAttachment attachment : attachments) {
            Path filePath = this.rootStorageLocation.resolve(attachment.getStoredFileName()).normalize();
            if (!filePath.getParent().equals(this.rootStorageLocation)) {
                System.err.println("Warning: skipped attachment path outside configured storage: " + filePath);
                continue;
            }
            try {
                Files.deleteIfExists(filePath);
            } catch (IOException e) {
                System.err.println("Warning: failed to delete physical file: " + filePath + " (" + e.getMessage() + ")");
            }
        }
    }
}
