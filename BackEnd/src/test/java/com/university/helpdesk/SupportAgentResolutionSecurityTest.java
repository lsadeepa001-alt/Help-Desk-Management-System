package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.*;
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

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class SupportAgentResolutionSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketAttachmentRepository attachmentRepository;
    @Autowired private TicketCommentRepository commentRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "Password@123";

    @BeforeEach
    void cleanDatabase() {
        notificationRepository.deleteAll();
        feedbackRepository.deleteAll();
        attachmentRepository.deleteAll();
        commentRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    private User createTestUser(String username, Role role, String department) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            User u = new User();
            u.setUsername(username);
            u.setPassword(passwordEncoder.encode(DEFAULT_PASSWORD));
            u.setEmail(username + "@university.edu");
            u.setFullName(username.replace('_', ' '));
            u.setRole(role);
            u.setDepartment(department);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });
    }

    private String getLoginToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"" + username + "\",\"password\":\"" + DEFAULT_PASSWORD + "\"}"))
                .andExpect(status().isOk())
                .andReturn();

        return "Bearer " + objectMapper.readTree(result.getResponse().getContentAsString()).get("token").asText();
    }

    @Test
    @DisplayName("1. Assigned Support Agent in matching department resolves IN_PROGRESS ticket -> 200 + RESOLVED")
    void assignedMatchingSupportAgentResolvesInProgressTicket() throws Exception {
        User student = createTestUser("res_student1", Role.STUDENT, null);
        User agent = createTestUser("res_agent1", Role.SUPPORT_AGENT, "IT");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-001");
        ticket.setTitle("Wi-Fi down in Hall A");
        ticket.setDescription("Access point unreachable");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.IN_PROGRESS);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(agent);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("res_agent1");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Replaced faulty PoE injector.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Replaced faulty PoE injector."))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        Ticket saved = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertEquals(Status.RESOLVED, saved.getStatus());
        assertEquals("Replaced faulty PoE injector.", saved.getResolutionNotes());
        assertNotNull(saved.getResolvedAt());
    }

    @Test
    @DisplayName("2. Different Support Agent attempting to resolve returns 403 Forbidden")
    void differentSupportAgentCannotResolveTicket() throws Exception {
        User student = createTestUser("res_student2", Role.STUDENT, null);
        User assignedAgent = createTestUser("res_agent_assigned", Role.SUPPORT_AGENT, "IT");
        User differentAgent = createTestUser("res_agent_diff", Role.SUPPORT_AGENT, "IT");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-002");
        ticket.setTitle("Printer queue jammed");
        ticket.setDescription("Printer prints blank pages");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.IN_PROGRESS);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(assignedAgent);
        ticket = ticketRepository.save(ticket);

        String diffAgentToken = getLoginToken("res_agent_diff");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", diffAgentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Cleared queue.\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("assigned to them")));
    }

    @Test
    @DisplayName("3. Matching assigned Support Agent but wrong technical department returns 403 Forbidden")
    void matchingAgentWrongDepartmentCannotResolveTicket() throws Exception {
        User student = createTestUser("res_student3", Role.STUDENT, null);
        User agent = createTestUser("res_agent_wrongdept", Role.SUPPORT_AGENT, "Maintenance");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-003");
        ticket.setTitle("Security badge malfunctioning");
        ticket.setDescription("Reader beeps red");
        ticket.setDepartment("Security");
        ticket.setStatus(Status.IN_PROGRESS);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(agent);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("res_agent_wrongdept");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Reprogrammed RFID badge.\"}"))
                .andExpect(status().isForbidden())
                .andExpect(jsonPath("$.message").value(org.hamcrest.Matchers.containsString("technical department")));
    }

    @Test
    @DisplayName("4. Unassigned ticket cannot be resolved and returns 400 Bad Request")
    void unassignedTicketCannotBeResolved() throws Exception {
        User student = createTestUser("res_student4", Role.STUDENT, null);
        User agent = createTestUser("res_agent_unassigned_test", Role.SUPPORT_AGENT, "IT");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-004");
        ticket.setTitle("Unassigned network ticket");
        ticket.setDescription("Nobody claimed this yet");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.IN_PROGRESS);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(null);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("res_agent_unassigned_test");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Arbitrary resolution note.\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("An unassigned ticket cannot be resolved. It must be assigned to a support agent first"));
    }

    @Test
    @DisplayName("5. Missing or blank resolution notes returns 400 Bad Request")
    void missingResolutionNotesReturns400() throws Exception {
        User student = createTestUser("res_student5", Role.STUDENT, null);
        User agent = createTestUser("res_agent5", Role.SUPPORT_AGENT, "IT");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-005");
        ticket.setTitle("Lab PC blue-screened");
        ticket.setDescription("BSOD on boot");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.IN_PROGRESS);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(agent);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("res_agent5");

        // Missing resolutionNotes
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Resolution notes are required when resolving a ticket"));

        // Blank resolutionNotes
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"   \"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Resolution notes are required when resolving a ticket"));
    }

    @Test
    @DisplayName("6. Assigned Support Agent can resolve a REOPENED ticket -> 200 + RESOLVED")
    void assignedAgentCanResolveReopenedTicket() throws Exception {
        User student = createTestUser("res_student6", Role.STUDENT, null);
        User agent = createTestUser("res_agent6", Role.SUPPORT_AGENT, "IT");

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-RES-006");
        ticket.setTitle("Intermittent Wi-Fi recurred");
        ticket.setDescription("Student reopened because issue persisted");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.REOPENED);
        ticket.setCreatedBy(student);
        ticket.setAssignedTo(agent);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("res_agent6");

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Re-tuned radio transmit channels.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("RESOLVED"))
                .andExpect(jsonPath("$.resolutionNotes").value("Re-tuned radio transmit channels."))
                .andExpect(jsonPath("$.resolvedAt").isNotEmpty());

        Ticket saved = ticketRepository.findById(ticket.getId()).orElseThrow();
        assertEquals(Status.RESOLVED, saved.getStatus());
        assertNotNull(saved.getResolvedAt());
    }
}
