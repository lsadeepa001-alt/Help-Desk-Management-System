package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.dto.AnalyticsInsightDTO;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
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

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class AnalyticsInsightSecurityTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private AnalyticsInsightRepository analyticsInsightRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    private static final String DEFAULT_PASSWORD = "Password@123";

    @BeforeEach
    void cleanDatabase() {
        analyticsInsightRepository.deleteAll();
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
    @DisplayName("1. Manager can create and retrieve strategic insights (with author spoof resistance)")
    void managerCanCreateAndRetrieveInsights() throws Exception {
        User manager = createTestUser("mgr_alice", Role.MANAGER_EXECUTIVE, "Executive Office");
        User spoofTarget = createTestUser("mgr_spoof", Role.MANAGER_EXECUTIVE, "Finance");

        String managerToken = getLoginToken("mgr_alice");

        // Attempt authorId spoofing in payload — backend must strictly use authenticated user
        String payload = """
                {
                  "authorId": %d,
                  "title": "Q3 Resolution Velocity",
                  "content": "Observed 18%% improvement in IT ticket closure times following routing adjustments."
                }
                """.formatted(spoofTarget.getId());

        MvcResult createResult = mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.title").value("Q3 Resolution Velocity"))
                .andExpect(jsonPath("$.authorId").value(manager.getId()))
                .andExpect(jsonPath("$.authorRole").value("MANAGER_EXECUTIVE"))
                .andExpect(jsonPath("$.department").value("Executive Office"))
                .andExpect(jsonPath("$.edited").value(false))
                .andReturn();

        AnalyticsInsightDTO createdDto = objectMapper.readValue(
                createResult.getResponse().getContentAsString(), AnalyticsInsightDTO.class);
        assertEquals(manager.getId(), createdDto.getAuthorId(), "Author ID must match authenticated manager, ignoring body spoofing");

        // Retrieve insights list
        mockMvc.perform(get("/analytics/insights")
                        .header("Authorization", managerToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].title").value("Q3 Resolution Velocity"));
    }

    @Test
    @DisplayName("2. Manager can update own insight and edited flag becomes true")
    void managerCanUpdateOwnInsight() throws Exception {
        User manager = createTestUser("mgr_updater", Role.MANAGER_EXECUTIVE, "Operations");
        String token = getLoginToken("mgr_updater");

        MvcResult createRes = mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Original Title\",\"content\":\"Initial observation\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        AnalyticsInsightDTO dto = objectMapper.readValue(createRes.getResponse().getContentAsString(), AnalyticsInsightDTO.class);

        // Update insight
        mockMvc.perform(put("/analytics/insights/" + dto.getId())
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Revised Title\",\"content\":\"Updated deeper analysis\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Revised Title"))
                .andExpect(jsonPath("$.content").value("Updated deeper analysis"))
                .andExpect(jsonPath("$.edited").value(true));
    }

    @Test
    @DisplayName("3. Cross-Manager IDOR Protection: Manager B cannot update or delete Manager A's insight")
    void crossManagerIdorProtection() throws Exception {
        User managerA = createTestUser("mgr_author_a", Role.MANAGER_EXECUTIVE, "IT Management");
        User managerB = createTestUser("mgr_attacker_b", Role.MANAGER_EXECUTIVE, "Facilities");

        String tokenA = getLoginToken("mgr_author_a");
        String tokenB = getLoginToken("mgr_attacker_b");

        MvcResult createRes = mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", tokenA)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Manager A Note\",\"content\":\"Sensitive executive review notes.\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        AnalyticsInsightDTO dto = objectMapper.readValue(createRes.getResponse().getContentAsString(), AnalyticsInsightDTO.class);

        // Manager B attempts to modify Manager A's insight -> 403 Forbidden
        mockMvc.perform(put("/analytics/insights/" + dto.getId())
                        .header("Authorization", tokenB)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Hijacked\",\"content\":\"Tampered content\"}"))
                .andExpect(status().isForbidden());

        // Manager B attempts to delete Manager A's insight -> 403 Forbidden
        mockMvc.perform(delete("/analytics/insights/" + dto.getId())
                        .header("Authorization", tokenB))
                .andExpect(status().isForbidden());

        // Verify content unchanged in database
        assertEquals(1, analyticsInsightRepository.count());
        assertEquals("Manager A Note", analyticsInsightRepository.findById(dto.getId()).orElseThrow().getTitle());
    }

    @Test
    @DisplayName("4. System Administrator has administrative oversight to edit and delete any insight")
    void adminCanUpdateAndDeleteAnyInsight() throws Exception {
        User manager = createTestUser("mgr_oversight_author", Role.MANAGER_EXECUTIVE, "Academic Ops");
        User admin = createTestUser("mgr_super_admin", Role.SYSTEM_ADMINISTRATOR, null);

        String managerToken = getLoginToken("mgr_oversight_author");
        String adminToken = getLoginToken("mgr_super_admin");

        MvcResult createRes = mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", managerToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Ops bottleneck\",\"content\":\"Maintenance delay analysis.\"}"))
                .andExpect(status().isCreated())
                .andReturn();

        AnalyticsInsightDTO dto = objectMapper.readValue(createRes.getResponse().getContentAsString(), AnalyticsInsightDTO.class);

        // Administrator updates manager's insight
        mockMvc.perform(put("/analytics/insights/" + dto.getId())
                        .header("Authorization", adminToken)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"Ops bottleneck (Admin Annotated)\",\"content\":\"Maintenance delay analysis with staffing adjustments.\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.title").value("Ops bottleneck (Admin Annotated)"));

        // Administrator deletes insight
        mockMvc.perform(delete("/analytics/insights/" + dto.getId())
                        .header("Authorization", adminToken))
                .andExpect(status().isNoContent());

        assertEquals(0, analyticsInsightRepository.count());
    }

    @Test
    @DisplayName("5. Non-privileged roles (Support Agent, Student) are forbidden from insights endpoints")
    void nonPrivilegedRolesForbidden() throws Exception {
        createTestUser("insight_agent", Role.SUPPORT_AGENT, "IT");
        createTestUser("insight_student", Role.STUDENT, null);

        String agentToken = getLoginToken("insight_agent");
        String studentToken = getLoginToken("insight_student");

        // Support Agent
        mockMvc.perform(get("/analytics/insights").header("Authorization", agentToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/analytics/insights").header("Authorization", agentToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Not allowed\"}"))
                .andExpect(status().isForbidden());

        // Student
        mockMvc.perform(get("/analytics/insights").header("Authorization", studentToken))
                .andExpect(status().isForbidden());
        mockMvc.perform(post("/analytics/insights").header("Authorization", studentToken)
                        .contentType(MediaType.APPLICATION_JSON).content("{\"content\":\"Not allowed\"}"))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("6. Input validation: Blank content returns 400 Bad Request")
    void blankContentReturnsBadRequest() throws Exception {
        createTestUser("mgr_val", Role.MANAGER_EXECUTIVE, null);
        String token = getLoginToken("mgr_val");

        // Blank content on create
        mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"No content\",\"content\":\"   \"}"))
                .andExpect(status().isBadRequest());

        // Null content on create
        mockMvc.perform(post("/analytics/insights")
                        .header("Authorization", token)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"title\":\"No content\"}"))
                .andExpect(status().isBadRequest());
    }
}
