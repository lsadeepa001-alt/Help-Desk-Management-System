package com.university.helpdesk.service;

import com.university.helpdesk.dto.TicketAttachmentDTO;
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

    private boolean isStaffUser(Authentication auth) {
        if (auth == null) return false;
        return auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SUPPORT_AGENT") ||
                a.getAuthority().equals("ROLE_TEAM_LEAD") ||
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
    }

    private void checkTicketAccess(Ticket ticket, User currentUser, Authentication auth) {
        if (isStaffUser(auth)) {
            return;
        }
        if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You are not authorized to view attachments for this ticket");
        }
    }

    public List<TicketAttachmentDTO> storeAttachments(Long ticketId, MultipartFile[] files, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        checkTicketAccess(ticket, currentUser, auth);

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

        checkTicketAccess(ticket, currentUser, auth);

        return attachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticketId)
                .stream()
                .map(TicketAttachmentDTO::new)
                .toList();
    }

    public Map.Entry<Resource, TicketAttachment> loadAttachmentResource(Long ticketId, Long attachmentId, Authentication auth) {
        User currentUser = getAuthenticatedUser(auth);
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found with id " + ticketId));

        checkTicketAccess(ticket, currentUser, auth);

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

        boolean isSystemAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        boolean isOwnerWhileOpen = ticket.getStatus() == Status.OPEN &&
                attachment.getUploadedBy() != null &&
                attachment.getUploadedBy().getId().equals(currentUser.getId());

        if (!isSystemAdmin && !isOwnerWhileOpen) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: Attachments can only be deleted by the uploader while the ticket is OPEN, or by a System Administrator");
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
