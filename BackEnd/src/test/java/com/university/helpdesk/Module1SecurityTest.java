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
    @DisplayName("Student and Lecturer public registration are allowed and persist null department")
    void studentAndLecturerRegistrationAllowed() throws Exception {
        String suffix = UUID.randomUUID().toString().substring(0, 8);

        registerPublicUser("student_" + suffix, "student_" + suffix + "@university.edu", "STUDENT")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.department").doesNotExist());

        User createdStudent = userRepository.findByUsername("student_" + suffix).orElseThrow();
        assertNull(createdStudent.getDepartment(), "Public student registration must persist null department");

        registerPublicUser("lecturer_" + suffix, "lecturer_" + suffix + "@university.edu", "LECTURER")
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.role").value("LECTURER"))
                .andExpect(jsonPath("$.department").doesNotExist());

        User createdLecturer = userRepository.findByUsername("lecturer_" + suffix).orElseThrow();
        assertNull(createdLecturer.getDepartment(), "Public lecturer registration must persist null department");
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
                                  "department":"IT",
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
    @DisplayName("Authenticated user can update only phone number on their own profile; identity fields are immutable")
    void ownProfileUpdateAllowedOnlyForPhoneNumber() throws Exception {
        mockMvc.perform(put("/users/" + student.getId() + "/profile")
                        .with(user(student.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Hacked Student Name",
                                  "email":"hacked@university.edu",
                                  "department":"IT",
                                  "phoneNumber":"+94-71-000-0000",
                                  "username":"attacker-selected-name",
                                  "role":"SYSTEM_ADMINISTRATOR",
                                  "status":"SUSPENDED"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneNumber").value("+94-71-000-0000"))
                .andExpect(jsonPath("$.fullName").value(student.getFullName()))
                .andExpect(jsonPath("$.email").value("module1.student@university.edu"))
                .andExpect(jsonPath("$.username").value("module1_student"))
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.password").doesNotExist());
    }

    @Test
    @DisplayName("System Administrator self-profile is restricted to phone number only and cannot self-assign department")
    void adminSelfProfileCannotModifyDepartmentOrIdentity() throws Exception {
        mockMvc.perform(put("/users/" + administrator.getId() + "/profile")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "fullName":"Hacked Admin Name",
                                  "email":"hacked.admin@university.edu",
                                  "department":"IT",
                                  "phoneNumber":"+94-77-999-9999"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.phoneNumber").value("+94-77-999-9999"))
                .andExpect(jsonPath("$.fullName").value(administrator.getFullName()))
                .andExpect(jsonPath("$.department").value("Test Department"));
    }

    @Test
    @DisplayName("Authenticated user cannot update another user's profile")
    void anotherUsersProfileUpdateRejected() throws Exception {
        mockMvc.perform(put("/users/" + otherStudent.getId() + "/profile")
                        .with(user(student.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "phoneNumber":"+94-71-111-2222"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("System Administrator can update another user's details, role, and operational technical department")
    void adminCanUpdateOtherUserDetailsAndRole() throws Exception {
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"updated_agent_user",
                                  "email":"updated.agent@university.edu",
                                  "fullName":"Updated Agent Name",
                                  "role":"SUPPORT_AGENT",
                                  "status":"ACTIVE",
                                  "department":"IT",
                                  "phoneNumber":"+94-77-123-4567"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.username").value("updated_agent_user"))
                .andExpect(jsonPath("$.email").value("updated.agent@university.edu"))
                .andExpect(jsonPath("$.fullName").value("Updated Agent Name"))
                .andExpect(jsonPath("$.role").value("SUPPORT_AGENT"))
                .andExpect(jsonPath("$.department").value("IT"))
                .andExpect(jsonPath("$.status").value("ACTIVE"))
                .andExpect(jsonPath("$.phoneNumber").value("+94-77-123-4567"));

        User updatedUser = userRepository.findById(otherStudent.getId()).orElseThrow();
        assertEquals("SUPPORT_AGENT", updatedUser.getRole().name());
        assertEquals("IT", updatedUser.getDepartment());
    }

    @Test
    @DisplayName("Non-administrator cannot update another user via admin update endpoint")
    void nonAdminCannotAdminUpdateOtherUser() throws Exception {
        mockMvc.perform(put("/users/" + student.getId())
                        .with(user(otherStudent.getUsername()).roles("STUDENT"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"hacked_user",
                                  "email":"hacked@university.edu",
                                  "fullName":"Hacked",
                                  "role":"SYSTEM_ADMINISTRATOR",
                                  "status":"ACTIVE"
                                }
                                """))
                .andExpect(status().isForbidden());
    }

    @Test
    @DisplayName("Admin user update requires valid technical department for SUPPORT_AGENT and TEAM_LEAD")
    void adminUpdateRequiresTechnicalDepartmentForOperationalRoles() throws Exception {
        // Missing department for SUPPORT_AGENT -> 400 Bad Request
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"valid_username",
                                  "email":"valid@university.edu",
                                  "fullName":"Valid Name",
                                  "role":"SUPPORT_AGENT",
                                  "status":"ACTIVE"
                                }
                                """))
                .andExpect(status().isBadRequest());

        // Invalid department for SUPPORT_AGENT -> 400 Bad Request
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"valid_username",
                                  "email":"valid@university.edu",
                                  "fullName":"Valid Name",
                                  "role":"SUPPORT_AGENT",
                                  "status":"ACTIVE",
                                  "department":"Faculty of Computing"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Admin user update clears technical department when updating to non-operational role")
    void adminUpdateClearsTechnicalDepartmentForNonOperationalRoles() throws Exception {
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"student_cleared",
                                  "email":"student.cleared@university.edu",
                                  "fullName":"Student Cleared",
                                  "role":"STUDENT",
                                  "status":"ACTIVE",
                                  "department":"IT"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.department").doesNotExist());
    }

    @Test
    @DisplayName("Admin user update rejects duplicate username or email with HTTP 400")
    void adminUpdateRejectsDuplicateUsernameOrEmail() throws Exception {
        // Duplicate username
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"module1_student",
                                  "email":"unique.email@university.edu",
                                  "fullName":"Dup User",
                                  "role":"STUDENT",
                                  "status":"ACTIVE"
                                }
                                """))
                .andExpect(status().isBadRequest());

        // Duplicate email
        mockMvc.perform(put("/users/" + otherStudent.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"unique_user",
                                  "email":"module1.student@university.edu",
                                  "fullName":"Dup Email",
                                  "role":"STUDENT",
                                  "status":"ACTIVE"
                                }
                                """))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Password reset requests endpoints are retired and self-service request endpoint is non-enumerating")
    void passwordResetEndpointsRetiredAndNonEnumerating() throws Exception {
        mockMvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"module1.student@university.edu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.resetToken").doesNotExist());

        mockMvc.perform(get("/users/password-reset-requests")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("System Administrator cannot target themselves for administrative edit, role modification, status toggle, or deletion")
    void adminCannotTargetThemselvesForAdministrativeActions() throws Exception {
        // 1. Privileged adminUpdateUser on self -> 400 Bad Request
        mockMvc.perform(put("/users/" + administrator.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "username":"module1_admin",
                                  "email":"module1.admin@university.edu",
                                  "fullName":"Admin Self Edit",
                                  "role":"SYSTEM_ADMINISTRATOR",
                                  "status":"ACTIVE"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("System Administrators cannot use administrative management on their own account. Personal contact details may be updated in Profile."));

        // 2. Role modification on self -> 400 Bad Request
        mockMvc.perform(put("/users/" + administrator.getId() + "/role")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "role":"STUDENT"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("System Administrators cannot modify their own role. Another administrator must perform this action."));

        // 3. Status modification on self -> 400 Bad Request
        mockMvc.perform(put("/users/" + administrator.getId() + "/status")
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "status":"SUSPENDED"
                                }
                                """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("System Administrators cannot suspend or deactivate their own account."));

        // 4. Deletion of self -> 400 Bad Request
        mockMvc.perform(delete("/users/" + administrator.getId())
                        .with(user(administrator.getUsername()).roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("System Administrators cannot delete their own account."));
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
                  "phoneNumber":"+94-70-123-4567"
                }
                """.formatted(username, email, role);
        return mockMvc.perform(post("/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content(body));
    }

    private record ResetPayload(String token, String newPassword) {}
}
