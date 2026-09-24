package com.university.helpdesk;

import com.university.helpdesk.config.DataSeeder;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.KnowledgeBaseArticleRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.web.servlet.MockMvc;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest(properties = {
        "spring.datasource.url=jdbc:h2:mem:clean-start;DB_CLOSE_DELAY=-1;MODE=MySQL",
        "spring.jpa.hibernate.ddl-auto=create-drop"
})
@AutoConfigureMockMvc
class CleanStartupDataTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private DataSeeder dataSeeder;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketCommentRepository ticketCommentRepository;

    @Autowired
    private KnowledgeBaseArticleRepository articleRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Test
    @DisplayName("Clean startup creates one bootstrap administrator, master categories, and no demo operational data")
    void cleanStartupContainsOnlyRequiredBootstrapAndReferenceData() throws Exception {
        assertEquals(1, userRepository.count());
        User administrator = userRepository.findAll().get(0);
        assertEquals(Role.SYSTEM_ADMINISTRATOR, administrator.getRole());
        assertEquals("bootstrap_admin", administrator.getUsername());
        assertTrue(passwordEncoder.matches("Bootstrap@123", administrator.getPassword()));

        assertEquals(0, userRepository.findByRole(Role.STUDENT).size());
        assertEquals(0, userRepository.findByRole(Role.LECTURER).size());
        assertEquals(0, userRepository.findByRole(Role.SUPPORT_AGENT).size());
        assertEquals(0, userRepository.findByRole(Role.TEAM_LEAD).size());
        assertEquals(0, userRepository.findByRole(Role.KNOWLEDGE_MANAGER).size());
        assertEquals(0, userRepository.findByRole(Role.MANAGER_EXECUTIVE).size());
        assertEquals(5, categoryRepository.count());
        assertEquals(0, ticketRepository.count());
        assertEquals(0, ticketCommentRepository.count());
        assertEquals(0, articleRepository.count());

        dataSeeder.run();
        assertEquals(1, userRepository.findByRole(Role.SYSTEM_ADMINISTRATOR).size());
        assertEquals(5, categoryRepository.count());

        mockMvc.perform(get("/kb/articles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(get("/kb/articles").param("query", "missing"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isEmpty());

        mockMvc.perform(post("/kb/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"message\":\"How do I solve an unknown issue?\",\"history\":[]}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedArticleId").doesNotExist())
                .andExpect(jsonPath("$.reply").isNotEmpty());

        var created = mockMvc.perform(post("/kb/articles")
                        .with(user("bootstrap_admin").roles("SYSTEM_ADMINISTRATOR"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "title":"Test-only article",
                                  "content":"Created explicitly by this test.",
                                  "category":"IT_SERVICES",
                                  "keywords":"test",
                                  "isFaq":false
                                }
                                """))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.title").value("Test-only article"))
                .andReturn();

        long articleId = new com.fasterxml.jackson.databind.ObjectMapper()
                .readTree(created.getResponse().getContentAsString()).get("id").asLong();

        mockMvc.perform(delete("/kb/articles/" + articleId)
                        .with(user("bootstrap_admin").roles("SYSTEM_ADMINISTRATOR")))
                .andExpect(status().isNoContent());
        assertEquals(0, articleRepository.count());

        userRepository.delete(administrator);
        User existingStudent = new User();
        existingStudent.setUsername("existing_student_fixture");
        existingStudent.setPassword(passwordEncoder.encode("Student@123"));
        existingStudent.setEmail("existing.student@test.invalid");
        existingStudent.setFullName("Existing Student Fixture");
        existingStudent.setRole(Role.STUDENT);
        existingStudent.setStatus("ACTIVE");
        userRepository.save(existingStudent);

        dataSeeder.run();
        assertEquals(1, userRepository.findByRole(Role.SYSTEM_ADMINISTRATOR).size(),
                "Bootstrap must check for an administrator even when other users already exist");
        assertEquals(1, userRepository.findByRole(Role.STUDENT).size(),
                "Startup must not create additional end-user accounts");
    }
}
