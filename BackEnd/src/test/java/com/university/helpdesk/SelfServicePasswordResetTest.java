package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.PasswordResetToken;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.PasswordResetTokenRepository;
import com.university.helpdesk.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.util.List;
import java.util.Map;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "app.password-reset.self-service=true",
        "app.email.enabled=true",
        "app.frontend.url=http://localhost:5173"
})
@AutoConfigureMockMvc
class SelfServicePasswordResetTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository userRepository;
    @Autowired private PasswordResetTokenRepository tokenRepository;
    @Autowired private PasswordEncoder passwordEncoder;

    @MockBean
    private JavaMailSender mailSender;

    private User student;

    @BeforeEach
    void setup() {
        tokenRepository.deleteAll();

        student = userRepository.findByUsername("reset_test_student").orElseGet(() -> {
            User u = new User();
            u.setUsername("reset_test_student");
            u.setEmail("reset.student@university.edu");
            u.setPassword(passwordEncoder.encode("InitialPassword@123"));
            u.setFullName("Reset Test Student");
            u.setRole(Role.STUDENT);
            u.setStatus("ACTIVE");
            u.setDepartment("General");
            return userRepository.save(u);
        });

        reset(mailSender);
    }

    @Test
    @DisplayName("Self-service reset: requests link, receives email with raw token, resets password, invalidates token")
    void testSelfServicePasswordResetFlow() throws Exception {
        // 1. Request password reset
        MvcResult requestResult = mockMvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"reset.student@university.edu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.resetToken").doesNotExist())
                .andReturn();

        // 2. Verify token record exists in DB with tokenHash populated (NOT null, NOT raw token)
        List<PasswordResetToken> tokens = tokenRepository.findByUserAndUsedAtIsNull(student);
        assertEquals(1, tokens.size(), "One active reset token should be recorded");
        PasswordResetToken dbToken = tokens.get(0);
        assertNotNull(dbToken.getTokenHash(), "Self-service tokens must store SHA-256 hash in database");
        assertNotNull(dbToken.getExpiresAt(), "Token must have an expiration timestamp");

        // 3. Verify EmailService invoked JavaMailSender with reset link containing raw token
        ArgumentCaptor<SimpleMailMessage> messageCaptor = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(mailSender, times(1)).send(messageCaptor.capture());
        SimpleMailMessage sentMessage = messageCaptor.getValue();

        assertNotNull(sentMessage.getTo());
        assertEquals("reset.student@university.edu", sentMessage.getTo()[0]);
        String body = sentMessage.getText();
        assertNotNull(body);
        assertTrue(body.contains("http://localhost:5173/password-reset?token="), "Email body must contain reset URL with token");

        // Extract raw token from email
        Pattern tokenPattern = Pattern.compile("token=([A-Za-z0-9_\\-]+)");
        Matcher matcher = tokenPattern.matcher(body);
        assertTrue(matcher.find(), "Must be able to extract token from email body");
        String rawToken = matcher.group(1);

        // Verify raw token is NOT stored as plaintext in DB
        assertNotEquals(rawToken, dbToken.getTokenHash(), "Raw token must not match DB hash directly");

        // 4. Confirm password reset using the raw token
        String newPassword = "NewSuperPassword@2026";
        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", rawToken,
                                "newPassword", newPassword
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty());

        // 5. Verify user password was changed in DB
        User updatedStudent = userRepository.findById(student.getId()).orElseThrow();
        assertTrue(passwordEncoder.matches(newPassword, updatedStudent.getPassword()),
                "User password in DB must match new password");
        assertTrue(updatedStudent.getTokenVersion() > student.getTokenVersion(),
                "User tokenVersion must be incremented to invalidate existing JWTs");

        // 6. Token must be marked as used and cannot be reused
        mockMvc.perform(post("/auth/password-reset/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "token", rawToken,
                                "newPassword", "AnotherPassword@123"
                        ))))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("Self-service reset: unknown email returns same generic response and sends no email")
    void testUnknownEmailReturnsGenericSuccessWithoutEmail() throws Exception {
        mockMvc.perform(post("/auth/password-reset/request")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"email\":\"nonexistent.user@university.edu\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").isNotEmpty())
                .andExpect(jsonPath("$.resetToken").doesNotExist());

        verify(mailSender, never()).send(any(SimpleMailMessage.class));
    }
}
