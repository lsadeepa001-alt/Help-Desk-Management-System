package com.university.helpdesk;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.PasswordResetTokenRepository;
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

import java.time.LocalDateTime;
import java.util.UUID;

import static org.junit.jupiter.api.Assertions.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
class Module1SecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordResetTokenRepository tokenRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private ObjectMapper objectMapper;

    private User student;
    private User otherStudent;
    private User administrator;
    private User supportAgent;

    @BeforeEach
    void setUp() {
        tokenRepository.deleteAll();
        student = ensureUser("module1_student", "module1.student@university.edu", Role.STUDENT, "Student@123");
        otherStudent = ensureUser("module1_other", "module1.other@university.edu", Role.STUDENT, "Student@123");
        administrator = ensureUser("module1_admin", "module1.admin@university.edu", Role.SYSTEM_ADMINISTRATOR, "Admin@123");
        supportAgent = ensureUser("module1_agent", "module1.agent@university.edu", Role.SUPPORT_AGENT, "Agent@123");
    }

    @Test
    @DisplayName("JWT login returns a usable token and preserves the authenticated identity")
    void loginReturnsUsableJwt() throws Exception {
        MvcResult login = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"module1_student","password":"Student@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andReturn();

        String token = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + token))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("module1_student"))
                .andExpect(jsonPath("$.password").doesNotExist());

        // The existing stateless logout removes the bearer token on the client.
        mockMvc.perform(get("/auth/me"))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"module1_student\",\"password\":\"wrong-password\"}"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.message").value("Invalid username or password"));
    }

    @Test
    @DisplayName("Student and Lecturer public registration are allowed")
    void studentAndLecturerRegistrationAllowed() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        registerPublicUser("student_" + suffix, "student_" + suffix + "@university.edu", "STUDENT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"));

        registerPublicUser("lecturer_" + suffix, "lecturer_" + suffix + "@university.edu", "LECTURER")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("LECTURER"));
    }

    @Test
    @DisplayName("All privileged roles are rejected by public registration")
    void privilegedPublicRegistrationRejected() throws Exception {
        Role[] privilegedRoles = {
                Role.SUPPORT_AGENT,
                Role.TEAM_LEAD,
                Role.KNOWLEDGE_MANAGER,
                Role.MANAGER_EXECUTIVE,
                Role.SYSTEM_ADMINISTRATOR
        };

        for (Role role : privilegedRoles) {
            String suffix = UUID.randomUUID().toString().substring(0, 8);
            registerPublicUser("blocked_" + suffix, "blocked_" + suffix + "@university.edu", role.name())
                    .andExpect(status().isBadRequest())
                    .andExpect(jsonPath("$.message").value(
                            "Error: Only Student and Lecturer accounts can be created via public registration."));
        }
    }

    @Test
    @DisplayName("System Administrator can provision a privileged staff account")
    void administratorCanCreateStaffAccount() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String username = "new_agent_" + suffix;

        mockMvc.perform(post("/users")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"%s",
                                  "password":"Agent@123",
                                  "email":"%s@university.edu",
                                  "fullName":"New Support Agent",
                                  "role":"SUPPORT_AGENT",
                                  "department":"IT Help Desk",
                                  "phoneNumber":"+94-77-123-4567",
                                  "status":"SUSPENDED",
                                  "tokenVersion":99
                                }
                                """.formatted(username, username)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("SUPPORT_AGENT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist());

        User created = userRepository.findByUsername(username).orElseThrow();
        assertTrue(passwordEncoder.matches("Agent@123", created.getPassword()));
    }

    @Test
    @DisplayName("Non-administrator cannot manage user roles")
    void unauthorizedRoleManagementRejected() throws Exception {
        mockMvc.perform(put("/users/" + supportAgent.getId() + "/role")
                        .with(user(student.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"role\":\"SYSTEM_ADMINISTRATOR\"}"))
                .andExpect(status().isForbidden());

        assertEquals(Role.SUPPORT_AGENT, userRepository.findById(supportAgent.getId()).orElseThrow().getRole());
    }

    @Test
    @DisplayName("Administrator account suspension invalidates existing JWT access")
    void accountSuspensionInvalidatesExistingJwt() throws Exception {
        MvcResult login = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"usernameOrEmail\":\"module1_agent\",\"password\":\"Agent@123\"}"))
                .andExpect(status().isOk())
                .andReturn();
        String jwt = objectMapper.readTree(login.getResponse().getContentAsString()).get("token").asText();

        mockMvc.perform(put("/users/" + supportAgent.getId() + "/status")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"SUSPENDED\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("SUSPENDED"));

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + jwt))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Authenticated user can update only allowed fields on their own profile")
    void ownProfileUpdateAllowedWithoutPrivilegeChanges() throws Exception {
        mockMvc.perform(put("/users/" + student.getId() + "/profile")
                        .with(user(student.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Updated Student Name",
                                  "email":"updated.module1@university.edu",
                                  "department":"Faculty of Computing",
                                  "phoneNumber":"+94-71-000-0000",
                                  "username":"attacker-selected-name",
                                  "role":"SYSTEM_ADMINISTRATOR",
                                  "status":"SUSPENDED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.fullName").value("Updated Student Name"))
                .andExpect(jsonPath("$.email").value("updated.module1@university.edu"))
                .andExpect(jsonPath("$.username").value("module1_student"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("Authenticated user cannot update another user's profile")
    void anotherUsersProfileUpdateRejected() throws Exception {
        mockMvc.perform(put("/users/" + otherStudent.getId() + "/profile")
                        .with(user(student.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Unauthorized Change",
                                  "email":"unauthorized@university.edu",
                                  "department":"Changed",
                                  "phoneNumber":"123"
                                }
                                """))
                .andExpect(status().isForbidden());

        assertNotEquals("Unauthorized Change", userRepository.findById(otherStudent.getId()).orElseThrow().getFullName());
    }

    @Test
    @DisplayName("Password reset is non-enumerating, persistent, administrator-issued, hashed, expiring, and single-use")
    void passwordResetValidationAndSecurityBehavior() throws Exception {
        MvcResult loginBeforeReset = mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"module1_student","password":"Student@123"}
                                """))
                .andExpect(status().isOk())
                .andReturn();
        String jwtBeforeReset = objectMapper.readTree(loginBeforeReset.getResponse().getContentAsString())
                .get("token").asText();

        MvcResult knownAccount = mockMvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"module1.student@university.edu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").doesNotExist())
                .andReturn();

        MvcResult unknownAccount = mockMvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"missing.account@university.edu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").doesNotExist())
                .andReturn();

        assertEquals(knownAccount.getResponse().getContentAsString(), unknownAccount.getResponse().getContentAsString());
        assertEquals(1, tokenRepository.count());
        assertNull(tokenRepository.findAll().get(0).getTokenHash(),
                "Public reset requests must not create or persist a raw reset credential");

        mockMvc.perform(get("/users/password-reset-requests")
                        .with(user(student.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());

        MvcResult pending = mockMvc.perform(get("/users/password-reset-requests")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$[0].username").value("module1_student"))
                .andExpect(jsonPath("$[0].resetToken").doesNotExist())
                .andReturn();

        long requestId = objectMapper.readTree(pending.getResponse().getContentAsString()).get(0).get("requestId").asLong();

        mockMvc.perform(post("/users/password-reset-requests/" + requestId + "/issue")
                        .with(user(student.getUsername()).roles("STUDENT")))
                .andExpect(status().isForbidden());

        MvcResult issue = mockMvc.perform(post("/users/password-reset-requests/" + requestId + "/issue")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isOk())
                .andExpect(header().string("Cache-Control", org.hamcrest.Matchers.containsString("no-store")))
                .andExpect(jsonPath("$.resetToken").isNotEmpty())
                .andReturn();

        String rawToken = objectMapper.readTree(issue.getResponse().getContentAsString()).get("resetToken").asText();
        assertEquals(1, tokenRepository.count());
        assertNotEquals(rawToken, tokenRepository.findAll().get(0).getTokenHash());
        assertEquals(64, tokenRepository.findAll().get(0).getTokenHash().length());
        assertFalse(tokenRepository.findAll().stream()
                .anyMatch(token -> rawToken.equals(token.getTokenHash())), "Raw reset credentials must never be persisted");

        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload("invalid-credential", "Changed@123"))))
                .andExpect(status().isBadRequest());

        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload(rawToken, "weak"))))
                .andExpect(status().isBadRequest());

        var persistedRequest = tokenRepository.findById(requestId).orElseThrow();
        persistedRequest.setExpiresAt(LocalDateTime.now().minusMinutes(1));
        tokenRepository.saveAndFlush(persistedRequest);

        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload(rawToken, "Changed@123"))))
                .andExpect(status().isBadRequest());

        MvcResult reissue = mockMvc.perform(post("/users/password-reset-requests/" + requestId + "/issue")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isOk())
                .andReturn();
        String reissuedToken = objectMapper.readTree(reissue.getResponse().getContentAsString()).get("resetToken").asText();
        assertNotEquals(rawToken, reissuedToken);

        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload(reissuedToken, "Changed@123"))))
                .andExpect(status().isOk());

        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(new ResetPayload(reissuedToken, "Another@123"))))
                .andExpect(status().isBadRequest());

        User updated = userRepository.findById(student.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches("Changed@123", updated.getPassword()));
        assertFalse(passwordEncoder.matches("Student@123", updated.getPassword()));

        mockMvc.perform(get("/auth/me").header("Authorization", "Bearer " + jwtBeforeReset))
                .andExpect(status().is4xxClientError());

        mockMvc.perform(post("/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {"usernameOrEmail":"module1_student","password":"Changed@123"}
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.token").isNotEmpty());
    }

    private User ensureUser(String username, String email, Role role, String rawPassword) {
        User user = userRepository.findByUsername(username).orElseGet(User::new);
        user.setUsername(username);
        user.setEmail(email);
        user.setFullName(username.replace('_', ' '));
        user.setPassword(passwordEncoder.encode(rawPassword));
        user.setRole(role);
        user.setDepartment("Test Department");
        user.setPhoneNumber("+94-70-000-0000");
        user.setStatus("ACTIVE");
        return userRepository.save(user);
    }

    private org.springframework.test.web.servlet.ResultActions registerPublicUser(String username, String email, String role)
            throws Exception {
        String body = """
                {
                  "username":"%s",
                  "password":"Valid@123",
                  "email":"%s",
                  "fullName":"Registration Test User",
                  "role":"%s",
                  "department":"Faculty of Computing",
                  "phoneNumber":"+94-70-123-4567"
                }
                """.formatted(username, email, role);
        return mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private record ResetPayload(String token, String newPassword) {}
}
