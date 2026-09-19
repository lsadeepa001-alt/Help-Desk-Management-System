package com.university.helpdesk;

import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.io.File;
import java.io.FileOutputStream;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class RoleAccessAndAttachmentSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketAttachmentRepository attachmentRepository;

    private User studentUser;
    private User otherStudentUser;
    private User agentUser;
    private User leadUser;
    private User managerUser;
    private User kmUser;
    private User adminUser;

    private Ticket testTicket;
    private TicketAttachment testAttachment;

    @BeforeEach
    void setUp() throws Exception {
        // Clean test database tables
        attachmentRepository.deleteAll();
        ticketRepository.deleteAll();

        // Ensure all required test users exist
        studentUser = userRepository.findByUsername("student").orElseGet(() -> {
            User u = new User();
            u.setUsername("student");
            u.setPassword("password");
            u.setEmail("student.test@university.edu");
            u.setFullName("Test Student");
            u.setRole(Role.STUDENT);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        otherStudentUser = userRepository.findByUsername("other_student").orElseGet(() -> {
            User u = new User();
            u.setUsername("other_student");
            u.setPassword("password");
            u.setEmail("other_student.test@university.edu");
            u.setFullName("Other Student");
            u.setRole(Role.STUDENT);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        agentUser = userRepository.findByUsername("agent").orElseGet(() -> {
            User u = new User();
            u.setUsername("agent");
            u.setPassword("password");
            u.setEmail("agent.test@university.edu");
            u.setFullName("Support Agent");
            u.setRole(Role.SUPPORT_AGENT);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        leadUser = userRepository.findByUsername("lead").orElseGet(() -> {
            User u = new User();
            u.setUsername("lead");
            u.setPassword("password");
            u.setEmail("lead.test@university.edu");
            u.setFullName("Team Lead");
            u.setRole(Role.TEAM_LEAD);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        managerUser = userRepository.findByUsername("manager").orElseGet(() -> {
            User u = new User();
            u.setUsername("manager");
            u.setPassword("password");
            u.setEmail("manager.test@university.edu");
            u.setFullName("Executive Manager");
            u.setRole(Role.MANAGER_EXECUTIVE);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        kmUser = userRepository.findByUsername("km").orElseGet(() -> {
            User u = new User();
            u.setUsername("km");
            u.setPassword("password");
            u.setEmail("km.test@university.edu");
            u.setFullName("Knowledge Manager");
            u.setRole(Role.KNOWLEDGE_MANAGER);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        adminUser = userRepository.findByUsername("admin").orElseGet(() -> {
            User u = new User();
            u.setUsername("admin");
            u.setPassword("password");
            u.setEmail("admin.test@university.edu");
            u.setFullName("System Administrator");
            u.setRole(Role.SYSTEM_ADMINISTRATOR);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });

        // Create a test ticket owned by studentUser
        testTicket = new Ticket();
        testTicket.setTicketNumber("TICK-TEST-0001");
        testTicket.setTitle("Network Connectivity Issue");
        testTicket.setDescription("Cannot connect to eduroam.");
        testTicket.setStatus(Status.OPEN);
        testTicket.setPriority(Priority.MEDIUM);
        testTicket.setCreatedBy(studentUser);
        testTicket = ticketRepository.save(testTicket);

        // Ensure test upload directory and a physical test file exist
        Path uploadDirPath = Paths.get("target", "test-uploads");
        Files.createDirectories(uploadDirPath);
        String physicalFileName = "test-attachment-file.pdf";
        File physicalFile = uploadDirPath.resolve(physicalFileName).toFile();
        try (FileOutputStream fos = new FileOutputStream(physicalFile)) {
            fos.write("Sample PDF content for security tests".getBytes());
        }

        // Create an attachment metadata entry
        testAttachment = new TicketAttachment();
        testAttachment.setTicket(testTicket);
        testAttachment.setOriginalFileName("network_report.pdf");
        testAttachment.setStoredFileName(physicalFileName);
        testAttachment.setStoragePath(physicalFile.getAbsolutePath());
        testAttachment.setContentType("application/pdf");
        testAttachment.setFileSize(physicalFile.length());
        testAttachment.setUploadedBy(studentUser);
        testAttachment = attachmentRepository.save(testAttachment);
    }

    // ─── 1. Role Boundary: MANAGER_EXECUTIVE cannot assign tickets (403) ───
    @Test
    @DisplayName("MANAGER_EXECUTIVE cannot assign tickets (returns 403)")
    @WithMockUser(username = "manager", roles = {"MANAGER_EXECUTIVE"})
    void managerExecutiveCannotAssignTickets() throws Exception {
        mockMvc.perform(put("/tickets/" + testTicket.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\": " + agentUser.getId() + "}"))
                .andExpect(status().isForbidden());
    }

    // ─── 2. Role Boundary: KNOWLEDGE_MANAGER cannot update ticket status (403) ───
    @Test
    @DisplayName("KNOWLEDGE_MANAGER cannot update ticket status (returns 403)")
    @WithMockUser(username = "km", roles = {"KNOWLEDGE_MANAGER"})
    void knowledgeManagerCannotUpdateTicketStatus() throws Exception {
        mockMvc.perform(put("/tickets/" + testTicket.getId() + "/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\": \"IN_PROGRESS\"}"))
                .andExpect(status().isForbidden());
    }

    // ─── 3. Role Boundary: SUPPORT_AGENT cannot reassign ticket to another agent ───
    @Test
    @DisplayName("SUPPORT_AGENT cannot assign ticket to another agent (returns 403)")
    @WithMockUser(username = "agent", roles = {"SUPPORT_AGENT"})
    void supportAgentCannotAssignToAnotherAgent() throws Exception {
        // agent tries to assign to leadUser
        mockMvc.perform(put("/tickets/" + testTicket.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\": " + leadUser.getId() + "}"))
                .andExpect(status().isForbidden());
    }

    // ─── 4. Role Boundary: TEAM_LEAD can assign ticket to any agent (200) ───
    @Test
    @DisplayName("TEAM_LEAD can assign ticket to an agent (returns 200)")
    @WithMockUser(username = "lead", roles = {"TEAM_LEAD"})
    void teamLeadCanAssignTicketToAgent() throws Exception {
        mockMvc.perform(put("/tickets/" + testTicket.getId() + "/assign")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\": " + agentUser.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(agentUser.getId()));
    }

    // ─── 5. Attachment Security: Disallowed archive (.zip) rejected (400) ───
    @Test
    @DisplayName("Disallowed archive upload (.zip) returns 400 Bad Request")
    @WithMockUser(username = "student", roles = {"STUDENT"})
    void disallowedArchiveUploadRejected() throws Exception {
        MockMultipartFile zipFile = new MockMultipartFile(
                "files",
                "archive.zip",
                "application/zip",
                "fake zip content".getBytes()
        );

        mockMvc.perform(multipart("/tickets/" + testTicket.getId() + "/attachments")
                        .file(zipFile))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").exists());
    }

    // ─── 6. Attachment Security: Whitelisted file (.png) succeeds for owner ───
    @Test
    @DisplayName("Whitelisted file upload (.png) succeeds for ticket creator (201)")
    @WithMockUser(username = "student", roles = {"STUDENT"})
    void whitelistedFileUploadSucceedsForCreator() throws Exception {
        MockMultipartFile imageFile = new MockMultipartFile(
                "files",
                "screenshot.png",
                "image/png",
                new byte[]{1, 2, 3, 4, 5}
        );

        mockMvc.perform(multipart("/tickets/" + testTicket.getId() + "/attachments")
                        .file(imageFile))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$[0].originalFileName").value("screenshot.png"));
    }

    // ─── 7. Attachment Security: Unrelated student cannot download attachment (403) ───
    @Test
    @DisplayName("Unrelated student cannot download another user's attachment (returns 403)")
    @WithMockUser(username = "other_student", roles = {"STUDENT"})
    void unrelatedStudentCannotDownloadAttachment() throws Exception {
        mockMvc.perform(get("/tickets/" + testTicket.getId() + "/attachments/" + testAttachment.getId() + "/download"))
                .andExpect(status().isForbidden());
    }

    // ─── 8. Attachment Security: Ticket creator can download attachment (200) ───
    @Test
    @DisplayName("Ticket creator can download their ticket attachment (returns 200)")
    @WithMockUser(username = "student", roles = {"STUDENT"})
    void ticketCreatorCanDownloadAttachment() throws Exception {
        mockMvc.perform(get("/tickets/" + testTicket.getId() + "/attachments/" + testAttachment.getId() + "/download"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("network_report.pdf")));
    }

    // ─── 9. Attachment Security: SYSTEM_ADMINISTRATOR can download any attachment (200) ───
    @Test
    @DisplayName("SYSTEM_ADMINISTRATOR can download any ticket attachment (returns 200)")
    @WithMockUser(username = "admin", roles = {"SYSTEM_ADMINISTRATOR"})
    void systemAdminCanDownloadAnyAttachment() throws Exception {
        mockMvc.perform(get("/tickets/" + testTicket.getId() + "/attachments/" + testAttachment.getId() + "/download"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.containsString("network_report.pdf")));
    }
}
