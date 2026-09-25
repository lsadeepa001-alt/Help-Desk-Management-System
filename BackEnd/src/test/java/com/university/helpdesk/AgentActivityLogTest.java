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

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AgentActivityLogTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketCommentRepository commentRepository;
    @Autowired private AgentActivityLogRepository agentActivityLogRepository;
    @Autowired private TicketAssignmentHistoryRepository assignmentHistoryRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "Password@123";

    @BeforeEach
    void cleanDatabase() {
        notificationRepository.deleteAll();
        feedbackRepository.deleteAll();
        agentActivityLogRepository.deleteAll();
        assignmentHistoryRepository.deleteAll();
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
    @DisplayName("Operational actions generate auditable AgentActivityLog records")
    void operationalActionsGenerateActivityLogs() throws Exception {
        User student = createTestUser("act_student1", Role.STUDENT, null);
        User agent1 = createTestUser("act_agent1", Role.SUPPORT_AGENT, "IT");
        User agent2 = createTestUser("act_agent2", Role.SUPPORT_AGENT, "IT");
        User lead = createTestUser("act_lead_it", Role.TEAM_LEAD, "IT");
        User admin = createTestUser("act_admin", Role.SYSTEM_ADMINISTRATOR, null);

        // 1. Create an OPEN ticket
        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-ACT-001");
        ticket.setTitle("Network Switch Failure");
        ticket.setDescription("Switch port flapping in Lab 2");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.OPEN);
        ticket.setCreatedBy(student);
        ticket = ticketRepository.save(ticket);

        // 2. Agent 1 claims ticket -> TICKET_CLAIMED
        String agent1Token = getLoginToken("act_agent1");
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/claim")
                        .header("Authorization", agent1Token))
                .andExpect(status().isOk());

        List<AgentActivityLog> claimLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(claimLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.TICKET_CLAIMED
                && l.getActorName().contains("act agent1")));

        // 3. Lead reassigns ticket to Agent 2 -> TICKET_REASSIGNED
        String leadToken = getLoginToken("act_lead_it");
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/assign")
                        .header("Authorization", leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + agent2.getId() + "}"))
                .andExpect(status().isOk());

        List<AgentActivityLog> reassignLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(reassignLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.TICKET_REASSIGNED));

        // 4. Admin reroutes ticket to Maintenance -> TICKET_REROUTED
        String adminToken = getLoginToken("act_admin");
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/route")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"department\":\"Maintenance\"}"))
                .andExpect(status().isOk());

        List<AgentActivityLog> rerouteLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(rerouteLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.TICKET_REROUTED));

        // Route it back to IT and reassign to Agent 2 for resolution
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/route")
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"department\":\"IT\"}"))
                .andExpect(status().isOk());
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/assign")
                        .header("Authorization", leadToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"agentId\":" + agent2.getId() + "}"))
                .andExpect(status().isOk());

        // 5. Agent 2 posts an internal note -> INTERNAL_NOTE_ADDED
        String agent2Token = getLoginToken("act_agent2");
        mockMvc.perform(post("/tickets/" + ticket.getId() + "/comments")
                        .header("Authorization", agent2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Tested patch cable continuity.\",\"isInternal\":true}"))
                .andExpect(status().isCreated());

        List<AgentActivityLog> noteLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(noteLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.INTERNAL_NOTE_ADDED));

        // 6. Agent 2 posts a public comment -> PUBLIC_COMMENT_ADDED
        mockMvc.perform(post("/tickets/" + ticket.getId() + "/comments")
                        .header("Authorization", agent2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"The switch firmware has been updated.\",\"isInternal\":false}"))
                .andExpect(status().isCreated());

        List<AgentActivityLog> publicCommentLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(publicCommentLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.PUBLIC_COMMENT_ADDED));

        // 7. Agent 2 resolves ticket -> TICKET_RESOLVED
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", agent2Token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"RESOLVED\",\"resolutionNotes\":\"Firmware patched and verified.\"}"))
                .andExpect(status().isOk());

        List<AgentActivityLog> resolveLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(resolveLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.TICKET_RESOLVED
                && l.getDetails().contains("Firmware patched and verified.")));

        // 8. Creator reopens ticket -> TICKET_REOPENED
        String studentToken = getLoginToken("act_student1");
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/reopen")
                        .header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"reason\":\"Port 12 still flapping intermittently.\"}"))
                .andExpect(status().isOk());

        List<AgentActivityLog> reopenLogs = agentActivityLogRepository.findAllByOrderByCreatedAtDesc();
        assertTrue(reopenLogs.stream().anyMatch(l -> l.getAction() == AgentActivityAction.TICKET_REOPENED
                && l.getDetails().contains("Port 12 still flapping")));
    }

    @Test
    @DisplayName("Activity log and summary endpoints enforce role authorization")
    void activityEndpointsEnforceRoleAuthorization() throws Exception {
        createTestUser("sec_manager", Role.MANAGER_EXECUTIVE, null);
        createTestUser("sec_admin", Role.SYSTEM_ADMINISTRATOR, null);
        createTestUser("sec_agent", Role.SUPPORT_AGENT, "IT");
        createTestUser("sec_student", Role.STUDENT, null);

        String managerToken = getLoginToken("sec_manager");
        String adminToken = getLoginToken("sec_admin");
        String agentToken = getLoginToken("sec_agent");
        String studentToken = getLoginToken("sec_student");

        // Managers & Admins can access activity-logs
        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", managerToken))
                .andExpect(status().isOk());

        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", adminToken))
                .andExpect(status().isOk());

        // Support Agents & Students get 403 Forbidden
        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", agentToken))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", studentToken))
                .andExpect(status().isForbidden());

        // Managers & Admins can access activity-summary
        mockMvc.perform(get("/analytics/activity-summary")
                        .header("Authorization", managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalActivities").exists())
                .andExpect(jsonPath("$.byAction").exists())
                .andExpect(jsonPath("$.byDepartment").exists());

        // Non-managers get 403 Forbidden
        mockMvc.perform(get("/analytics/activity-summary")
                        .header("Authorization", agentToken))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Activity log filtering returns filtered subsets accurately")
    void activityLogFilteringWorks() throws Exception {
        User student = createTestUser("flt_student", Role.STUDENT, null);
        User agentIt = createTestUser("flt_agent_it", Role.SUPPORT_AGENT, "IT");
        User manager = createTestUser("flt_manager", Role.MANAGER_EXECUTIVE, null);

        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-FLT-001");
        ticket.setTitle("Filter Test Ticket");
        ticket.setDescription("Testing activity filters");
        ticket.setDepartment("IT");
        ticket.setStatus(Status.OPEN);
        ticket.setCreatedBy(student);
        ticket = ticketRepository.save(ticket);

        String agentToken = getLoginToken("flt_agent_it");
        mockMvc.perform(put("/tickets/" + ticket.getId() + "/claim")
                        .header("Authorization", agentToken))
                .andExpect(status().isOk());

        String managerToken = getLoginToken("flt_manager");

        // Filter by action=TICKET_CLAIMED
        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", managerToken)
                        .param("action", "TICKET_CLAIMED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].action").value("TICKET_CLAIMED"));

        // Filter by nonexistent action
        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", managerToken)
                        .param("action", "TICKET_RESOLVED"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));

        // Filter by department=IT
        mockMvc.perform(get("/analytics/activity-logs")
                        .header("Authorization", managerToken)
                        .param("department", "IT"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1));
    }
}
