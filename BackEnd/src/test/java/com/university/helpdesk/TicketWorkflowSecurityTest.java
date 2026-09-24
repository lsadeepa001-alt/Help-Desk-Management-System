package com.university.helpdesk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.*;
import com.university.helpdesk.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TicketWorkflowSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketAttachmentRepository attachmentRepository;
    @Autowired private TicketCommentRepository commentRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private JwtUtils jwtUtils;
    @Autowired private PasswordEncoder passwordEncoder;

    @BeforeEach
    void cleanTicketData() {
        notificationRepository.deleteAll();
        feedbackRepository.deleteAll();
        attachmentRepository.deleteAll();
        commentRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    @Test
    @DisplayName("End-to-End Proposal Workflow: Direct department routing -> Assign -> Resolve -> Confirm Close")
    void fullProposalLifecycleWorkflow() throws Exception {
        User student = createUser(Role.STUDENT, null);
        User lead = createUser(Role.TEAM_LEAD, "IT");
        User agent = createUser(Role.SUPPORT_AGENT, "IT");

        String studentToken = bearerToken(student);
        String leadToken = bearerToken(lead);
        String agentToken = bearerToken(agent);

        // 1. Student creates ticket directly selecting IT Department
        MvcResult createResult = mockMvc.perform(post("/tickets")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Wi-Fi disconnects in Library\",\"description\":\"Connection drops every 5 minutes\",\"priority\":\"HIGH\",\"department\":\"IT\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.status").value("OPEN"))
                .andExpect(jsonPath("$.department").value("IT"))
                .andExpect(jsonPath("$.createdBy.id").value(student.getId()))
                .andReturn();

        long ticketId = objectMapper.readTree(createResult.getResponse().getContentAsString()).get("id").asLong();

        // 2. IT Team Lead assigns ticket to IT Support Agent (transitions OPEN -> IN_PROGRESS)
        mockMvc.perform(put("/tickets/" + ticketId + "/assign")
                        .header("Authorization", leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + agent.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(agent.getId()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        assertEquals(Status.IN_PROGRESS, ticketRepository.findById(ticketId).orElseThrow().getStatus());

        // 3. Support Agent resolves the ticket with mandatory resolution notes
        mockMvc.perform(put("/tickets/" + ticketId + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Replaced faulty access point PoE injector.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Replaced faulty access point PoE injector."))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        // 4. Student confirms resolution -> CLOSED
        mockMvc.perform(put("/tickets/" + ticketId + "/confirm")
                        .header("Authorization", studentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CLOSED"));

        assertEquals(Status.CLOSED, ticketRepository.findById(ticketId).orElseThrow().getStatus());

        // 5. Student reopens ticket -> REOPENED
        mockMvc.perform(put("/tickets/" + ticketId + "/reopen")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Signal is still weak in corner desk.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REOPENED"))
                .andExpect(jsonPath("$.resolvedAt").isEmpty());

        assertEquals(Status.REOPENED, ticketRepository.findById(ticketId).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Frontline Support Agent can self-claim an unassigned OPEN ticket in their department")
    void supportAgentCanSelfClaimUnassignedTicket() throws Exception {
        User lecturer = createUser(Role.LECTURER, null);
        User agent = createUser(Role.SUPPORT_AGENT, "Maintenance");
        String agentToken = bearerToken(agent);

        Ticket ticket = createTicket(lecturer, Status.OPEN, "Maintenance");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/claim")
                        .header("Authorization", agentToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(agent.getId()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));

        assertEquals(Status.IN_PROGRESS, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
        assertEquals(agent.getId(), ticketRepository.findById(ticket.getId()).orElseThrow().getAssignedTo().getId());
    }

    @Test
    @DisplayName("Ticket submission requires a valid technical department (IT, Maintenance, Security)")
    void ticketSubmissionRequiresDepartment() throws Exception {
        User student = createUser(Role.STUDENT, null);
        String token = bearerToken(student);

        // Missing department
        mockMvc.perform(post("/tickets")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"No department\",\"description\":\"Should fail\"}"))
                .andExpect(status().isBadRequest());

        // Invalid department
        mockMvc.perform(post("/tickets")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Invalid dept\",\"description\":\"Should fail\",\"department\":\"Finance\"}"))
                .andExpect(status().isBadRequest());

        // Valid department
        mockMvc.perform(post("/tickets")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Valid dept\",\"description\":\"Should succeed\",\"department\":\"Security\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.department").value("Security"))
                .andExpect(jsonPath("$.status").value("OPEN"));
    }

    @Test
    @DisplayName("Team Lead assigns only tickets to Support Agents in the same department")
    void teamLeadDepartmentAssignmentRulesAreEnforced() throws Exception {
        User owner = createUser(Role.STUDENT, null);
        User lead = createUser(Role.TEAM_LEAD, "IT");
        User matchingAgent = createUser(Role.SUPPORT_AGENT, "IT");
        User wrongDepartmentAgent = createUser(Role.SUPPORT_AGENT, "Security");
        Ticket openTicket = createTicket(owner, Status.OPEN, "IT");

        // Wrong department agent cannot assign
        mockMvc.perform(put("/tickets/" + openTicket.getId() + "/assign")
                        .header("Authorization", bearerToken(wrongDepartmentAgent))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + matchingAgent.getId() + "}"))
                .andExpect(status().isForbidden());

        // Team Lead cannot assign to agent in another department
        mockMvc.perform(put("/tickets/" + openTicket.getId() + "/assign")
                        .header("Authorization", bearerToken(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + wrongDepartmentAgent.getId() + "}"))
                .andExpect(status().isBadRequest());

        // Team Lead assigns to matching agent -> 200 OK and IN_PROGRESS
        mockMvc.perform(put("/tickets/" + openTicket.getId() + "/assign")
                        .header("Authorization", bearerToken(lead))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + matchingAgent.getId() + "}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.assignedTo.id").value(matchingAgent.getId()))
                .andExpect(jsonPath("$.status").value("IN_PROGRESS"));
    }

    @Test
    @DisplayName("Resolving a ticket requires mandatory resolution notes")
    void resolutionRequiresMandatoryNotes() throws Exception {
        User owner = createUser(Role.STUDENT, null);
        User agent = createUser(Role.SUPPORT_AGENT, "IT");
        Ticket ticket = createTicket(owner, Status.IN_PROGRESS, "IT");
        ticket.setAssignedTo(agent);
        ticketRepository.save(ticket);

        // Attempting to resolve without notes fails
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", bearerToken(agent))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isBadRequest());

        // Resolving with resolutionNotes succeeds
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", bearerToken(agent))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Fixed issue by configuring correct subnet mask.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Fixed issue by configuring correct subnet mask."));
    }

    @Test
    @DisplayName("Student and Lecturer cannot CRUD another user's ticket")
    void endUsersCannotCrudAnotherUsersTicket() throws Exception {
        User owner = createUser(Role.STUDENT, null);
        Ticket ticket = createTicket(owner, Status.OPEN, "IT");

        for (Role role : new Role[]{Role.STUDENT, Role.LECTURER}) {
            User otherUser = createUser(role, null);
            String token = bearerToken(otherUser);

            mockMvc.perform(get("/tickets/" + ticket.getId()).header("Authorization", token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(put("/tickets/" + ticket.getId())
                            .header("Authorization", token)
                            .contentType(MediaType.APPLICATION_JSON)
                            .content("{\"title\":\"Unauthorized edit\"}"))
                    .andExpect(status().isForbidden());
            mockMvc.perform(delete("/tickets/" + ticket.getId()).header("Authorization", token))
                    .andExpect(status().isForbidden());
            mockMvc.perform(delete("/tickets/" + ticket.getId() + "/permanent").header("Authorization", token))
                    .andExpect(status().isForbidden());
        }

        assertTrue(ticketRepository.existsById(ticket.getId()));
    }

    @Test
    @DisplayName("Ticket creator can soft-cancel own OPEN ticket, but cannot permanently delete")
    void creatorCanCancelOwnOpenTicket() throws Exception {
        User owner = createUser(Role.STUDENT, null);
        Ticket ticket = createTicket(owner, Status.OPEN, "IT");
        String token = bearerToken(owner);

        // Permanent deletion by creator is forbidden (strictly restricted to System Administrator)
        mockMvc.perform(delete("/tickets/" + ticket.getId() + "/permanent").header("Authorization", token))
                .andExpect(status().isForbidden());

        // Soft cancellation succeeds
        mockMvc.perform(delete("/tickets/" + ticket.getId()).header("Authorization", token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertEquals(Status.CANCELLED, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("System Administrator permanent deletion cascades dependent records and attachment files")
    void permanentDeletionRestrictedToAdministrator() throws Exception {
        User owner = createUser(Role.STUDENT, null);
        User admin = createUser(Role.SYSTEM_ADMINISTRATOR, null);
        Ticket ticket = createTicket(owner, Status.OPEN, "IT");

        Path uploadDir = Path.of("target", "test-uploads").toAbsolutePath().normalize();
        Files.createDirectories(uploadDir);
        String storedFileName = "delete-" + UUID.randomUUID() + ".txt";
        Path attachmentPath = uploadDir.resolve(storedFileName);
        Files.writeString(attachmentPath, "dependent file");

        TicketAttachment attachment = new TicketAttachment();
        attachment.setTicket(ticket);
        attachment.setUploadedBy(owner);
        attachment.setOriginalFileName("dependent.txt");
        attachment.setStoredFileName(storedFileName);
        attachment.setContentType("text/plain");
        attachment.setFileSize(Files.size(attachmentPath));
        attachment.setStoragePath(attachmentPath.toString());
        attachmentRepository.save(attachment);

        TicketComment comment = new TicketComment();
        comment.setTicket(ticket);
        comment.setAuthor(owner);
        comment.setContent("Dependent comment");
        commentRepository.save(comment);

        Feedback feedback = new Feedback();
        feedback.setTicket(ticket);
        feedback.setSubmittedBy(owner);
        feedback.setRating(5);
        feedbackRepository.save(feedback);

        notificationRepository.save(new Notification(owner, "Ticket notice", "Dependent notification",
                NotificationType.STATUS_UPDATED, ticket.getId()));

        // Non-admin receives 403 Forbidden
        mockMvc.perform(delete("/tickets/" + ticket.getId() + "/permanent")
                        .header("Authorization", bearerToken(owner)))
                .andExpect(status().isForbidden());

        // Admin succeeds with 204 No Content
        mockMvc.perform(delete("/tickets/" + ticket.getId() + "/permanent")
                        .header("Authorization", bearerToken(admin)))
                .andExpect(status().isNoContent());

        assertFalse(ticketRepository.existsById(ticket.getId()));
        assertTrue(attachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticket.getId()).isEmpty());
        assertTrue(commentRepository.findByTicketIdOrderByCreatedAtAsc(ticket.getId()).isEmpty());
        assertTrue(feedbackRepository.findByTicketId(ticket.getId()).isEmpty());
        assertTrue(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(owner.getId()).stream()
                .noneMatch(notification -> ticket.getId().equals(notification.getRelatedTicketId())));
        assertFalse(Files.exists(attachmentPath));
    }

    private User createUser(Role role, String department) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        User user = new User();
        user.setUsername(role.name().toLowerCase() + "_workflow_" + suffix);
        user.setPassword(passwordEncoder.encode("Workflow@123"));
        user.setEmail(role.name().toLowerCase() + ".workflow." + suffix + "@test.invalid");
        user.setFullName(role.name() + " Workflow User");
        user.setRole(role);
        user.setDepartment(department);
        user.setStatus("ACTIVE");
        return userRepository.save(user);
    }

    private Ticket createTicket(User creator, Status status, String department) {
        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-WF-" + UUID.randomUUID().toString().replace("-", "").substring(0, 10));
        ticket.setTitle("Workflow security test");
        ticket.setDescription("Ticket created for workflow authorization testing.");
        ticket.setPriority(Priority.MEDIUM);
        ticket.setStatus(status);
        ticket.setDepartment(department);
        ticket.setCreatedBy(creator);
        return ticketRepository.save(ticket);
    }

    private String bearerToken(User user) {
        return "Bearer " + jwtUtils.generateToken(user);
    }
}
