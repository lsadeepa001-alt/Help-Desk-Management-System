package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.dto.AdminUserCreateRequest;
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

import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
public class SecurityHardeningAndDepartmentTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private TicketRepository ticketRepository;
    @Autowired private TicketCommentRepository commentRepository;
    @Autowired private FeedbackRepository feedbackRepository;
    @Autowired private TicketAttachmentRepository attachmentRepository;
    @Autowired private PasswordEncoder passwordEncoder;
    @Autowired private JwtUtils jwtUtils;

    private User studentA;
    private User studentB;
    private User agentIT;
    private User otherAgentIT;
    private User agentMaint;
    private User leadIT;
    private User leadMaint;
    private User manager;
    private User admin;

    private Ticket ticketIT;

    @BeforeEach
    void setUp() {
        feedbackRepository.deleteAll();
        commentRepository.deleteAll();
        attachmentRepository.deleteAll();
        ticketRepository.deleteAll();

        studentA = ensureUser("sec_student_a", "sec_student_a@test.edu", Role.STUDENT, "StudentA", "IT");
        studentB = ensureUser("sec_student_b", "sec_student_b@test.edu", Role.STUDENT, "StudentB", "Business");
        agentIT = ensureUser("sec_agent_it", "sec_agent_it@test.edu", Role.SUPPORT_AGENT, "Agent IT", "IT");
        otherAgentIT = ensureUser("sec_other_agent_it", "sec_other_agent_it@test.edu", Role.SUPPORT_AGENT, "Other Agent IT", "IT");
        agentMaint = ensureUser("sec_agent_maint", "sec_agent_maint@test.edu", Role.SUPPORT_AGENT, "Agent Maint", "Maintenance");
        leadIT = ensureUser("sec_lead_it", "sec_lead_it@test.edu", Role.TEAM_LEAD, "Lead IT", "IT");
        leadMaint = ensureUser("sec_lead_maint", "sec_lead_maint@test.edu", Role.TEAM_LEAD, "Lead Maint", "Maintenance");
        manager = ensureUser("sec_manager", "sec_manager@test.edu", Role.MANAGER_EXECUTIVE, "Manager", null);
        admin = ensureUser("sec_admin", "sec_admin@test.edu", Role.SYSTEM_ADMINISTRATOR, "Admin", null);

        // Create IT ticket owned by studentA and assigned to agentIT
        ticketIT = new Ticket();
        ticketIT.setTicketNumber("HD-SEC-1001");
        ticketIT.setTitle("IT Connectivity Issue");
        ticketIT.setDescription("Cannot connect to university Wi-Fi");
        ticketIT.setDepartment("IT");
        ticketIT.setPriority(Priority.HIGH);
        ticketIT.setStatus(Status.IN_PROGRESS);
        ticketIT.setCreatedBy(studentA);
        ticketIT.setAssignedTo(agentIT);
        ticketIT = ticketRepository.save(ticketIT);
    }

    private User ensureUser(String username, String email, Role role, String fullName, String department) {
        return userRepository.findByUsername(username).orElseGet(() -> {
            User u = new User();
            u.setUsername(username);
            u.setEmail(email);
            u.setPassword(passwordEncoder.encode("SecurePass@123"));
            u.setFullName(fullName);
            u.setRole(role);
            u.setStatus("ACTIVE");
            u.setDepartment(department);
            return userRepository.save(u);
        });
    }

    private String tokenFor(User user) {
        return jwtUtils.generateToken(user);
    }

    // ─── PART 6: Consistent Spring Security 401/403 JSON ──────────────────────

    @Test
    @DisplayName("401 JSON: Missing authentication returns 401 with JSON message")
    void missingAuthenticationReturns401Json() throws Exception {
        mockMvc.perform(get("/users"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("401 JSON: Invalid JWT returns 401 with JSON message")
    void invalidJwtReturns401Json() throws Exception {
        mockMvc.perform(get("/users")
                        .header("Authorization", "Bearer invalid.malformed.token"))
                .andExpect(status().isUnauthorized())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    @DisplayName("403 JSON: Valid user with wrong role returns 403 with JSON message")
    void wrongRoleReturns403Json() throws Exception {
        mockMvc.perform(get("/users")
                        .header("Authorization", "Bearer " + tokenFor(studentA)))
                .andExpect(status().isForbidden())
                .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_JSON))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    // ─── PART 2: Ticket Comment Object-Level Authorization ────────────────────

    @Test
    @DisplayName("Comment Auth: Student A can read and post comments on own ticket")
    void studentCanCommentOnOwnTicket() throws Exception {
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(studentA))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Please help resolve quickly\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.content").value("Please help resolve quickly"));

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(studentA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].content").value("Please help resolve quickly"));
    }

    @Test
    @DisplayName("Comment Auth: Student B receives 403 trying to GET or POST comments on Student A's ticket")
    void studentCannotAccessOtherStudentTicketComments() throws Exception {
        // Direct ID manipulation POST
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(studentB))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Malicious injected comment\"}"))
                .andExpect(status().isForbidden());

        // Direct ID manipulation GET
        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(studentB)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Comment Auth: Support Agent assigned to ticket can post/read comments, other agent receives 403")
    void supportAgentCommentAuthorization() throws Exception {
        // Assigned agent in same department -> 200/201 OK
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(agentIT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Investigating Wi-Fi AP log\", \"isInternal\": true}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(agentIT)))
                .andExpect(status().isOk());

        // Unassigned agent in same department -> 403 Forbidden
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(otherAgentIT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Unassigned agent comment\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(otherAgentIT)))
                .andExpect(status().isForbidden());

        // Agent in different department -> 403 Forbidden
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(agentMaint))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Cross-dept comment\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(agentMaint)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Comment Auth: Team Lead in same department can read/post, different department receives 403")
    void teamLeadCommentAuthorization() throws Exception {
        // Team lead in same department -> OK
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(leadIT))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Lead reviewing ticket\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(leadIT)))
                .andExpect(status().isOk());

        // Team lead in different department -> 403 Forbidden
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(leadMaint))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Cross-dept lead comment\"}"))
                .andExpect(status().isForbidden());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(leadMaint)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Comment Auth: System Administrator has system-wide comment access")
    void adminCommentAuthorization() throws Exception {
        mockMvc.perform(post("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"content\":\"Admin oversight comment\"}"))
                .andExpect(status().isCreated());

        mockMvc.perform(get("/tickets/" + ticketIT.getId() + "/comments")
                        .header("Authorization", "Bearer " + tokenFor(admin)))
                .andExpect(status().isOk());
    }

    // ─── PART 3: Feedback Object-Level Authorization ──────────────────────────

    @Test
    @DisplayName("Feedback Auth: Student A can view own ticket feedback, Student B receives 403")
    void studentFeedbackAuthorization() throws Exception {
        Feedback fb = new Feedback();
        fb.setTicket(ticketIT);
        fb.setSubmittedBy(studentA);
        fb.setRating(5);
        fb.setComments("Great support!");
        feedbackRepository.save(fb);

        // Own ticket feedback -> 200 OK
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(studentA)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].rating").value(5));

        // Other student ticket feedback -> 403 Forbidden
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(studentB)))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Feedback Auth: Assigned agent and same-dept lead can view feedback, cross-dept receives 403")
    void staffFeedbackAuthorization() throws Exception {
        Feedback fb = new Feedback();
        fb.setTicket(ticketIT);
        fb.setSubmittedBy(studentA);
        fb.setRating(4);
        fb.setComments("Resolved promptly");
        feedbackRepository.save(fb);

        // Assigned Agent in IT -> 200 OK
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(agentIT)))
                .andExpect(status().isOk());

        // Unassigned Agent in IT -> 403 Forbidden
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(otherAgentIT)))
                .andExpect(status().isForbidden());

        // Lead in IT -> 200 OK
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(leadIT)))
                .andExpect(status().isOk());

        // Lead in Maintenance -> 403 Forbidden
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(leadMaint)))
                .andExpect(status().isForbidden());

        // Manager and Admin -> 200 OK
        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(manager)))
                .andExpect(status().isOk());

        mockMvc.perform(get("/feedback/ticket/" + ticketIT.getId())
                        .header("Authorization", "Bearer " + tokenFor(admin)))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("Feedback Summary: Agent views own summary; Team Lead views agents in own department only")
    void agentSummaryAuthorization() throws Exception {
        // Agent views own summary -> 200 OK
        mockMvc.perform(get("/feedback/agent/" + agentIT.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(agentIT)))
                .andExpect(status().isOk());

        // Agent views other agent's summary -> 403 Forbidden
        mockMvc.perform(get("/feedback/agent/" + otherAgentIT.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(agentIT)))
                .andExpect(status().isForbidden());

        // Lead in IT views IT agent -> 200 OK
        mockMvc.perform(get("/feedback/agent/" + agentIT.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(leadIT)))
                .andExpect(status().isOk());

        // Lead in IT views Maintenance agent -> 403 Forbidden
        mockMvc.perform(get("/feedback/agent/" + agentMaint.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(leadIT)))
                .andExpect(status().isForbidden());

        // Manager and Admin view any agent -> 200 OK
        mockMvc.perform(get("/feedback/agent/" + agentIT.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(manager)))
                .andExpect(status().isOk());
        mockMvc.perform(get("/feedback/agent/" + agentIT.getId() + "/summary")
                        .header("Authorization", "Bearer " + tokenFor(admin)))
                .andExpect(status().isOk());
    }

    // ─── PART 7: Privileged Staff Department Validation ───────────────────────

    @Test
    @DisplayName("Department Validation: Support Agent + IT succeeds")
    void supportAgentWithItDepartmentSucceeds() throws Exception {
        AdminUserCreateRequest req = new AdminUserCreateRequest();
        req.setUsername("new_agent_it");
        req.setPassword("ValidPassword@123");
        req.setEmail("new_agent_it@test.edu");
        req.setFullName("New Agent IT");
        req.setRole(Role.SUPPORT_AGENT);
        req.setDepartment("IT");

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.department").value("IT"));
    }

    @Test
    @DisplayName("Department Validation: Team Lead + Maintenance succeeds")
    void teamLeadWithMaintenanceDepartmentSucceeds() throws Exception {
        AdminUserCreateRequest req = new AdminUserCreateRequest();
        req.setUsername("new_lead_maint");
        req.setPassword("ValidPassword@123");
        req.setEmail("new_lead_maint@test.edu");
        req.setFullName("New Lead Maint");
        req.setRole(Role.TEAM_LEAD);
        req.setDepartment("Maintenance");

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.department").value("Maintenance"));
    }

    @Test
    @DisplayName("Department Validation: Support Agent + missing department returns 400")
    void supportAgentMissingDepartmentFails() throws Exception {
        AdminUserCreateRequest req = new AdminUserCreateRequest();
        req.setUsername("agent_no_dept");
        req.setPassword("ValidPassword@123");
        req.setEmail("agent_no_dept@test.edu");
        req.setFullName("Agent No Dept");
        req.setRole(Role.SUPPORT_AGENT);
        req.setDepartment(null);

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Department is required")));
    }

    @Test
    @DisplayName("Department Validation: Team Lead + arbitrary department returns 400")
    void teamLeadArbitraryDepartmentFails() throws Exception {
        AdminUserCreateRequest req = new AdminUserCreateRequest();
        req.setUsername("lead_invalid_dept");
        req.setPassword("ValidPassword@123");
        req.setEmail("lead_invalid_dept@test.edu");
        req.setFullName("Lead Invalid Dept");
        req.setRole(Role.TEAM_LEAD);
        req.setDepartment("Faculty of Computing");

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Invalid technical department")));
    }

    @Test
    @DisplayName("Department Validation: Knowledge Manager with no technical department succeeds")
    void knowledgeManagerWithoutTechnicalDepartmentSucceeds() throws Exception {
        AdminUserCreateRequest req = new AdminUserCreateRequest();
        req.setUsername("new_km_nodept");
        req.setPassword("ValidPassword@123");
        req.setEmail("new_km_nodept@test.edu");
        req.setFullName("New KM");
        req.setRole(Role.KNOWLEDGE_MANAGER);
        req.setDepartment(null);

        mockMvc.perform(post("/users")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.department").doesNotExist());
    }

    @Test
    @DisplayName("Department Validation: Updating role to SUPPORT_AGENT without technical department returns 400")
    void roleUpdateToOperationalWithoutDepartmentFails() throws Exception {
        User userWithoutDept = ensureUser("user_no_dept", "user_no_dept@test.edu", Role.STUDENT, "No Dept User", null);

        mockMvc.perform(put("/users/" + userWithoutDept.getId() + "/role")
                        .header("Authorization", "Bearer " + tokenFor(admin))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SUPPORT_AGENT\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Department is required")));
    }
}
