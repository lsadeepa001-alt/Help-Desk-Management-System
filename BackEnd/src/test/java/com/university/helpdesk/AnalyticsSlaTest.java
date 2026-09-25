package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.*;
import com.university.helpdesk.repository.*;
import com.university.helpdesk.service.AnalyticsService;
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
import java.util.Map;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AnalyticsSlaTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketAttachmentRepository attachmentRepository;
    @Autowired private TicketCommentRepository commentRepository;
    @Autowired private TicketAssignmentHistoryRepository assignmentHistoryRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private NotificationRepository notificationRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private AnalyticsService analyticsService;

    private static final String DEFAULT_PASSWORD = "Password@123";

    private User testUser;
    private User managerUser;
    private User adminUser;
    private User studentUser;

    @BeforeEach
    void setup() {
        notificationRepository.deleteAll();
        feedbackRepository.deleteAll();
        attachmentRepository.deleteAll();
        commentRepository.deleteAll();
        assignmentHistoryRepository.deleteAll();
        ticketRepository.deleteAll();

        testUser = createTestUser("sla_submitter", Role.STUDENT, "General");
        managerUser = createTestUser("sla_manager", Role.MANAGER_EXECUTIVE, "Management");
        adminUser = createTestUser("sla_admin", Role.SYSTEM_ADMINISTRATOR, "IT");
        studentUser = createTestUser("sla_student", Role.STUDENT, "General");

        // Reset default thresholds
        analyticsService.setSlaThresholdLow(72);
        analyticsService.setSlaThresholdMedium(48);
        analyticsService.setSlaThresholdHigh(24);
        analyticsService.setSlaThresholdUrgent(8);
        analyticsService.setSlaThresholdCritical(4);
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

    private String loginAndGetToken(String username) throws Exception {
        MvcResult result = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "usernameOrEmail", username,
                                "password", DEFAULT_PASSWORD
                        ))))
                .andExpect(status().isOk())
                .andReturn();

        Map<?, ?> map = objectMapper.readValue(result.getResponse().getContentAsString(), Map.class);
        return (String) map.get("token");
    }

    private Ticket createTicketWithTimes(Priority priority, Status status,
                                         LocalDateTime createdAt, LocalDateTime resolvedAt) {
        Ticket t = new Ticket();
        t.setTitle("SLA Test Ticket " + UUID.randomUUID());
        t.setDescription("Test description for SLA evaluation");
        t.setDepartment("IT");
        t.setPriority(priority);
        t.setStatus(status);
        t.setCreatedBy(testUser);
        t.setCreatedAt(createdAt);
        t.setResolvedAt(resolvedAt);
        return ticketRepository.save(t);
    }

    @Test
    @DisplayName("Empty tickets list returns zero metrics without divide-by-zero")
    void zeroTicketsHandledSafely() {
        Map<String, Object> compliance = analyticsService.getSlaCompliance();

        assertNotNull(compliance);
        assertEquals(0L, ((Number) compliance.get("totalMeasuredTickets")).longValue());
        assertEquals(0L, ((Number) compliance.get("slaMetCount")).longValue());
        assertEquals(0L, ((Number) compliance.get("slaBreachedCount")).longValue());
        assertEquals(0.0, ((Number) compliance.get("compliancePercentage")).doubleValue(), 0.001);

        @SuppressWarnings("unchecked")
        Map<String, Object> perPriority = (Map<String, Object>) compliance.get("perPriority");
        assertNotNull(perPriority);
        assertEquals(5, perPriority.size());

        for (Priority p : Priority.values()) {
            assertTrue(perPriority.containsKey(p.name()), "perPriority must contain " + p.name());
            @SuppressWarnings("unchecked")
            Map<String, Object> pMap = (Map<String, Object>) perPriority.get(p.name());
            assertEquals(analyticsService.getThresholdHours(p), ((Number) pMap.get("thresholdHours")).longValue());
            assertEquals(0L, ((Number) pMap.get("total")).longValue());
            assertEquals(0L, ((Number) pMap.get("met")).longValue());
            assertEquals(0L, ((Number) pMap.get("breached")).longValue());
            assertEquals(0.0, ((Number) pMap.get("compliancePercentage")).doubleValue(), 0.001);
        }
    }

    @Test
    @DisplayName("CANCELLED and REJECTED terminal tickets are excluded from SLA measurement")
    void terminalStatesExcluded() {
        LocalDateTime now = LocalDateTime.now();
        createTicketWithTimes(Priority.HIGH, Status.CANCELLED, now.minusHours(50), null);
        createTicketWithTimes(Priority.HIGH, Status.REJECTED, now.minusHours(50), null);

        Map<String, Object> compliance = analyticsService.getSlaCompliance();
        assertEquals(0L, ((Number) compliance.get("totalMeasuredTickets")).longValue());
        assertEquals(0L, ((Number) compliance.get("slaMetCount")).longValue());
        assertEquals(0L, ((Number) compliance.get("slaBreachedCount")).longValue());
    }

    @Test
    @DisplayName("Resolved/Closed tickets use creation to resolution time against threshold")
    void resolvedAndClosedTicketsMeasurement() {
        LocalDateTime now = LocalDateTime.now();

        // HIGH priority threshold = 24 hours
        // Ticket 1: Resolved in 10 hours -> MET
        createTicketWithTimes(Priority.HIGH, Status.RESOLVED, now.minusHours(30), now.minusHours(20));

        // Ticket 2: Resolved in 26 hours -> BREACHED
        createTicketWithTimes(Priority.HIGH, Status.CLOSED, now.minusHours(40), now.minusHours(14));

        Map<String, Object> compliance = analyticsService.getSlaCompliance();
        assertEquals(2L, ((Number) compliance.get("totalMeasuredTickets")).longValue());
        assertEquals(1L, ((Number) compliance.get("slaMetCount")).longValue());
        assertEquals(1L, ((Number) compliance.get("slaBreachedCount")).longValue());
        assertEquals(50.0, ((Number) compliance.get("compliancePercentage")).doubleValue(), 0.1);

        @SuppressWarnings("unchecked")
        Map<String, Object> perPriority = (Map<String, Object>) compliance.get("perPriority");
        @SuppressWarnings("unchecked")
        Map<String, Object> highMap = (Map<String, Object>) perPriority.get("HIGH");
        assertEquals(2L, ((Number) highMap.get("total")).longValue());
        assertEquals(1L, ((Number) highMap.get("met")).longValue());
        assertEquals(1L, ((Number) highMap.get("breached")).longValue());
        assertEquals(50.0, ((Number) highMap.get("compliancePercentage")).doubleValue(), 0.1);
    }

    @Test
    @DisplayName("Active unresolved tickets use elapsed age from creation to now")
    void activeUnresolvedTicketsMeasurement() {
        LocalDateTime now = LocalDateTime.now();

        // URGENT threshold = 8 hours
        // Ticket 1: Created 2 hours ago -> MET (within threshold)
        createTicketWithTimes(Priority.URGENT, Status.OPEN, now.minusHours(2), null);

        // Ticket 2: Created 12 hours ago -> BREACHED (exceeded threshold)
        createTicketWithTimes(Priority.URGENT, Status.IN_PROGRESS, now.minusHours(12), null);

        Map<String, Object> compliance = analyticsService.getSlaCompliance();
        assertEquals(2L, ((Number) compliance.get("totalMeasuredTickets")).longValue());
        assertEquals(1L, ((Number) compliance.get("slaMetCount")).longValue());
        assertEquals(1L, ((Number) compliance.get("slaBreachedCount")).longValue());
        assertEquals(50.0, ((Number) compliance.get("compliancePercentage")).doubleValue(), 0.1);
    }

    @Test
    @DisplayName("Supports every Priority enum value with configurable thresholds")
    void supportsAllPrioritiesAndConfigurableThresholds() {
        LocalDateTime now = LocalDateTime.now();

        // Set custom thresholds
        analyticsService.setSlaThresholdLow(100);
        analyticsService.setSlaThresholdMedium(50);
        analyticsService.setSlaThresholdHigh(30);
        analyticsService.setSlaThresholdUrgent(10);
        analyticsService.setSlaThresholdCritical(2);

        // Create one met ticket for each priority
        createTicketWithTimes(Priority.LOW, Status.OPEN, now.minusHours(10), null);
        createTicketWithTimes(Priority.MEDIUM, Status.OPEN, now.minusHours(10), null);
        createTicketWithTimes(Priority.HIGH, Status.OPEN, now.minusHours(10), null);
        createTicketWithTimes(Priority.URGENT, Status.OPEN, now.minusHours(5), null);
        createTicketWithTimes(Priority.CRITICAL, Status.OPEN, now.minusHours(1), null);

        Map<String, Object> compliance = analyticsService.getSlaCompliance();
        assertEquals(5L, ((Number) compliance.get("totalMeasuredTickets")).longValue());
        assertEquals(5L, ((Number) compliance.get("slaMetCount")).longValue());
        assertEquals(0L, ((Number) compliance.get("slaBreachedCount")).longValue());
        assertEquals(100.0, ((Number) compliance.get("compliancePercentage")).doubleValue(), 0.1);

        @SuppressWarnings("unchecked")
        Map<String, Object> perPriority = (Map<String, Object>) compliance.get("perPriority");

        assertEquals(100L, ((Number) ((Map<?, ?>) perPriority.get("LOW")).get("thresholdHours")).longValue());
        assertEquals(50L, ((Number) ((Map<?, ?>) perPriority.get("MEDIUM")).get("thresholdHours")).longValue());
        assertEquals(30L, ((Number) ((Map<?, ?>) perPriority.get("HIGH")).get("thresholdHours")).longValue());
        assertEquals(10L, ((Number) ((Map<?, ?>) perPriority.get("URGENT")).get("thresholdHours")).longValue());
        assertEquals(2L, ((Number) ((Map<?, ?>) perPriority.get("CRITICAL")).get("thresholdHours")).longValue());
    }

    @Test
    @DisplayName("Endpoint /analytics/sla-compliance authorization: Manager & Admin allowed, Student forbidden")
    void endpointAuthorization() throws Exception {
        String managerToken = loginAndGetToken(managerUser.getUsername());
        String adminToken = loginAndGetToken(adminUser.getUsername());
        String studentToken = loginAndGetToken(studentUser.getUsername());

        // MANAGER_EXECUTIVE can access
        mockMvc.perform(get("/analytics/sla-compliance")
                        .header("Authorization", "Bearer " + managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMeasuredTickets").exists())
                .andExpect(jsonPath("$.slaMetCount").exists())
                .andExpect(jsonPath("$.slaBreachedCount").exists())
                .andExpect(jsonPath("$.compliancePercentage").exists())
                .andExpect(jsonPath("$.perPriority").exists())
                .andExpect(jsonPath("$.perPriority.LOW").exists())
                .andExpect(jsonPath("$.perPriority.MEDIUM").exists())
                .andExpect(jsonPath("$.perPriority.HIGH").exists())
                .andExpect(jsonPath("$.perPriority.URGENT").exists())
                .andExpect(jsonPath("$.perPriority.CRITICAL").exists());

        // SYSTEM_ADMINISTRATOR can access
        mockMvc.perform(get("/analytics/sla-compliance")
                        .header("Authorization", "Bearer " + adminToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.totalMeasuredTickets").exists());

        // STUDENT is forbidden (403)
        mockMvc.perform(get("/analytics/sla-compliance")
                        .header("Authorization", "Bearer " + studentToken))
                .andExpect(status().isForbidden());
    }
}
