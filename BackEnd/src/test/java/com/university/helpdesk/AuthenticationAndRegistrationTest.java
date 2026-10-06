package com.university.helpdesk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.dto.AdminUserCreateRequest;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
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

import java.util.UUID;

import static org.hamcrest.Matchers.containsString;
import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class AuthenticationAndRegistrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private static final String STRONG_PASSWORD = "Password@123";

    private User testAdmin;

    @BeforeEach
    void setUp() {
        testAdmin = userRepository.findByUsername("auth_test_admin").orElseGet(() -> {
            User u = new User();
            u.setUsername("auth_test_admin");
            u.setEmail("auth_test_admin@university.edu");
            u.setFullName("Auth Test Admin");
            u.setPassword(passwordEncoder.encode(STRONG_PASSWORD));
            u.setRole(Role.SYSTEM_ADMINISTRATOR);
            u.setStatus("ACTIVE");
            return userRepository.save(u);
        });
    }

    @Test
    @DisplayName("Public registration succeeds for STUDENT and persists null department")
    void publicRegistrationStudent_SucceedsWithNullDepartment() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String username = "student_" + uid;
        String email = username + "@university.edu";

        String payload = """
                {
                  "fullName": "Student User %s",
                  "username": "%s",
                  "email": "%s",
                  "password": "%s",
                  "role": "STUDENT",
                  "phoneNumber": "+94-77-111-2222"
                }
                """.formatted(uid, username, email, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.department").doesNotExist());

        User created = userRepository.findByUsername(username).orElseThrow();
        assertNull(created.getDepartment(), "Public student registration must persist null department in database");
        assertEquals("ACTIVE", created.getStatus());
    }

    @Test
    @DisplayName("Public registration succeeds for LECTURER and persists null department")
    void publicRegistrationLecturer_SucceedsWithNullDepartment() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String username = "lecturer_" + uid;
        String email = username + "@university.edu";

        String payload = """
                {
                  "fullName": "Lecturer User %s",
                  "username": "%s",
                  "email": "%s",
                  "password": "%s",
                  "role": "LECTURER",
                  "phoneNumber": "+94-77-333-4444"
                }
                """.formatted(uid, username, email, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("LECTURER"))
                .andExpect(jsonPath("$.department").doesNotExist());

        User created = userRepository.findByUsername(username).orElseThrow();
        assertNull(created.getDepartment(), "Public lecturer registration must persist null department in database");
    }

    @Test
    @DisplayName("Public registration rejects all privileged roles with HTTP 400")
    void publicRegistration_RejectsPrivilegedRoles() throws Exception {
        Role[] privilegedRoles = {
                Role.SUPPORT_AGENT,
                Role.TEAM_LEAD,
                Role.KNOWLEDGE_MANAGER,
                Role.MANAGER_EXECUTIVE,
                Role.SYSTEM_ADMINISTRATOR
        };

        for (Role role : privilegedRoles) {
            String uid = UUID.randomUUID().toString().substring(0, 8);
            String payload = """
                    {
                      "fullName": "Privileged Candidate",
                      "username": "priv_%s",
                      "email": "priv_%s@university.edu",
                      "password": "%s",
                      "role": "%s"
                    }
                    """.formatted(uid, uid, STRONG_PASSWORD, role.name());

            mockMvc.perform(post("/auth/register")
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(payload))
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Error: Only Student and Lecturer accounts can be created via public registration."));
        }
    }

    @Test
    @DisplayName("Public registration rejects duplicate username with HTTP 400")
    void publicRegistration_RejectsDuplicateUsername() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String username = "dup_user_" + uid;

        String payload1 = """
                {
                  "fullName": "User One",
                  "username": "%s",
                  "email": "email1_%s@university.edu",
                  "password": "%s",
                  "role": "STUDENT"
                }
                """.formatted(username, uid, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload1))
                .andExpect(status().isCreated());

        String payload2 = """
                {
                  "fullName": "User Two",
                  "username": "%s",
                  "email": "email2_%s@university.edu",
                  "password": "%s",
                  "role": "STUDENT"
                }
                """.formatted(username, uid, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload2))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Username is already taken."));
    }

    @Test
    @DisplayName("Public registration rejects duplicate email with HTTP 400")
    void publicRegistration_RejectsDuplicateEmail() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String email = "shared_" + uid + "@university.edu";

        String payload1 = """
                {
                  "fullName": "User One",
                  "username": "user1_%s",
                  "email": "%s",
                  "password": "%s",
                  "role": "STUDENT"
                }
                """.formatted(uid, email, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload1))
                .andExpect(status().isCreated());

        String payload2 = """
                {
                  "fullName": "User Two",
                  "username": "user2_%s",
                  "email": "%s",
                  "password": "%s",
                  "role": "STUDENT"
                }
                """.formatted(uid, email, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload2))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Email is already in use."));
    }

    @Test
    @DisplayName("Public registration rejects invalid email format with structured validation error")
    void publicRegistration_RejectsInvalidEmailFormat() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String payload = """
                {
                  "fullName": "Bad Email User",
                  "username": "bad_email_%s",
                  "email": "not-an-email",
                  "password": "%s",
                  "role": "STUDENT"
                }
                """.formatted(uid, STRONG_PASSWORD);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.email").isNotEmpty());
    }

    @Test
    @DisplayName("Public registration rejects weak password with structured validation error")
    void publicRegistration_RejectsWeakPassword() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String payload = """
                {
                  "fullName": "Weak Password User",
                  "username": "weak_pwd_%s",
                  "email": "weak_%s@university.edu",
                  "password": "weak",
                  "role": "STUDENT"
                }
                """.formatted(uid, uid);

        mockMvc.perform(post("/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fieldErrors.password").isNotEmpty());
    }

    @Test
    @DisplayName("Login succeeds with valid username and password")
    void login_SucceedsWithUsername() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User u = ensureTestUser("login_user_" + uid, "login_" + uid + "@university.edu", Role.STUDENT, "ACTIVE");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"%s","password":"%s"}
                                """.formatted(u.getUsername(), STRONG_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value(u.getUsername()));
    }

    @Test
    @DisplayName("Login succeeds with valid email and password")
    void login_SucceedsWithEmail() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User u = ensureTestUser("login_email_" + uid, "login_email_" + uid + "@university.edu", Role.LECTURER, "ACTIVE");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"%s","password":"%s"}
                                """.formatted(u.getEmail(), STRONG_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.email").value(u.getEmail()));
    }

    @Test
    @DisplayName("Login succeeds with email matching ignoring case")
    void login_SucceedsWithEmailIgnoringCase() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        String email = "case_sensitive_" + uid + "@university.edu";
        ensureTestUser("case_user_" + uid, email, Role.STUDENT, "ACTIVE");

        // Submit uppercase version of email
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"%s","password":"%s"}
                                """.formatted(email.toUpperCase(), STRONG_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value("case_user_" + uid));
    }

    @Test
    @DisplayName("Login succeeds with leading and trailing whitespace on usernameOrEmail")
    void login_SucceedsWithWhitespaceOnIdentifier() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User u = ensureTestUser("trim_user_" + uid, "trim_" + uid + "@university.edu", Role.STUDENT, "ACTIVE");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"  %s  ","password":"%s"}
                                """.formatted(u.getUsername(), STRONG_PASSWORD)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.username").value(u.getUsername()));
    }

    @Test
    @DisplayName("Login fails with invalid password returning HTTP 401")
    void login_FailsWithInvalidPassword() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User u = ensureTestUser("wrong_pwd_" + uid, "wrong_pwd_" + uid + "@university.edu", Role.STUDENT, "ACTIVE");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"%s","password":"IncorrectPassword1!"}
                                """.formatted(u.getUsername())))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Login fails with unknown username/email returning HTTP 401")
    void login_FailsWithUnknownUser() throws Exception {
        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"completely_nonexistent_user","password":"Password@123"}
                                """))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Login fails with suspended/inactive user returning HTTP 401")
    void login_FailsWithSuspendedUser() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);
        User u = ensureTestUser("suspended_" + uid, "suspended_" + uid + "@university.edu", Role.STUDENT, "SUSPENDED");

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"%s","password":"%s"}
                                """.formatted(u.getUsername(), STRONG_PASSWORD)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Administrator can provision operational staff with valid technical departments")
    void adminStaffCreation_EnforcesOperationalTechnicalDepartment() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        // 1. Missing department on SUPPORT_AGENT returns 400
        AdminUserCreateRequest missingDept = new AdminUserCreateRequest();
        missingDept.setUsername("agent_nodept_" + uid);
        missingDept.setPassword(STRONG_PASSWORD);
        missingDept.setEmail("agent_nodept_" + uid + "@university.edu");
        missingDept.setFullName("Agent No Dept");
        missingDept.setRole(Role.SUPPORT_AGENT);
        missingDept.setDepartment(null);

        mockMvc.perform(post("/users")
                        .with(user(testAdmin.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(missingDept)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Department is required")));

        // 2. Invalid department on TEAM_LEAD returns 400
        AdminUserCreateRequest invalidDept = new AdminUserCreateRequest();
        invalidDept.setUsername("lead_baddept_" + uid);
        invalidDept.setPassword(STRONG_PASSWORD);
        invalidDept.setEmail("lead_baddept_" + uid + "@university.edu");
        invalidDept.setFullName("Lead Bad Dept");
        invalidDept.setRole(Role.TEAM_LEAD);
        invalidDept.setDepartment("Faculty of Computing");

        mockMvc.perform(post("/users")
                        .with(user(testAdmin.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDept)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value(containsString("Invalid technical department")));

        // 3. Valid technical department IT on SUPPORT_AGENT succeeds
        AdminUserCreateRequest validAgent = new AdminUserCreateRequest();
        validAgent.setUsername("agent_it_" + uid);
        validAgent.setPassword(STRONG_PASSWORD);
        validAgent.setEmail("agent_it_" + uid + "@university.edu");
        validAgent.setFullName("Agent IT");
        validAgent.setRole(Role.SUPPORT_AGENT);
        validAgent.setDepartment("IT");

        mockMvc.perform(post("/users")
                        .with(user(testAdmin.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validAgent)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("SUPPORT_AGENT"))
                .andExpect(jsonPath("$.department").value("IT"));
    }

    @Test
    @DisplayName("Non-operational roles provisioned by admin do not require technical departments")
    void adminStaffCreation_NonOperationalRolesDoNotRequireDepartment() throws Exception {
        String uid = UUID.randomUUID().toString().substring(0, 8);

        AdminUserCreateRequest km = new AdminUserCreateRequest();
        km.setUsername("km_" + uid);
        km.setPassword(STRONG_PASSWORD);
        km.setEmail("km_" + uid + "@university.edu");
        km.setFullName("Knowledge Manager " + uid);
        km.setRole(Role.KNOWLEDGE_MANAGER);
        km.setDepartment(null);

        mockMvc.perform(post("/users")
                        .with(user(testAdmin.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(km)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("KNOWLEDGE_MANAGER"))
                .andExpect(jsonPath("$.department").doesNotExist());
    }

    private User ensureTestUser(String username, String email, Role role, String status) {
        User u = new User();
        u.setUsername(username);
        u.setEmail(email);
        u.setFullName(username.replace('_', ' '));
        u.setPassword(passwordEncoder.encode(STRONG_PASSWORD));
        u.setRole(role);
        u.setStatus(status);
        return userRepository.save(u);
    }
}
