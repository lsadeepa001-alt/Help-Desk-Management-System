package com.university.helpdesk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.university.helpdesk.model.KbCategory;
import com.university.helpdesk.model.KnowledgeBaseArticle;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.KnowledgeBaseArticleRepository;
import com.university.helpdesk.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Collections;
import java.util.Map;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class ChatbotGroundingTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private KnowledgeBaseArticleRepository articleRepository;
    @Autowired private UserRepository userRepository;

    private KnowledgeBaseArticle wifiArticle;

    @BeforeEach
    void setup() {
        articleRepository.deleteAll();

        User author = userRepository.findByUsername("chatbot_test_author").orElseGet(() -> {
            User u = new User();
            u.setUsername("chatbot_test_author");
            u.setEmail("chatbot.author@university.edu");
            u.setPassword("Pass@123");
            u.setFullName("Chatbot Author");
            u.setRole(Role.KNOWLEDGE_MANAGER);
            u.setStatus("ACTIVE");
            u.setDepartment("IT");
            return userRepository.save(u);
        });

        wifiArticle = new KnowledgeBaseArticle();
        wifiArticle.setTitle("How to connect to Campus Wi-Fi Eduroam");
        wifiArticle.setContent("Select Eduroam SSID and enter your student email credentials. Trust the campus certificate.");
        wifiArticle.setCategory(KbCategory.IT_SERVICES);
        wifiArticle.setKeywords("wifi wireless eduroam internet network");
        wifiArticle.setFaq(true);
        wifiArticle.setAuthor(author);
        wifiArticle = articleRepository.save(wifiArticle);
    }

    @Test
    @DisplayName("Grounded inquiry: matching KB article resolves issue without escalation")
    void testGroundedInquiryResolvesWithoutEscalation() throws Exception {
        mockMvc.perform(post("/kb/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "How do I configure eduroam wifi?",
                                "history", Collections.emptyList()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reply").isNotEmpty())
                .andExpect(jsonPath("$.matchedArticleId").value(wifiArticle.getId()))
                .andExpect(jsonPath("$.needsEscalation").value(false))
                .andExpect(jsonPath("$.resolved").value(true))
                .andExpect(jsonPath("$.canDeflect").value(true));
    }

    @Test
    @DisplayName("Ungrounded inquiry: unknown policy/question triggers escalation without hallucinating")
    void testUngroundedInquiryTriggersEscalation() throws Exception {
        mockMvc.perform(post("/kb/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "What is the policy on getting a tuition refund after week 6?",
                                "history", Collections.emptyList()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedArticleId").doesNotExist())
                .andExpect(jsonPath("$.needsEscalation").value(true))
                .andExpect(jsonPath("$.resolved").value(false))
                .andExpect(jsonPath("$.canDeflect").value(true))
                .andExpect(jsonPath("$.reply", containsString("couldn't find a solution in the University Knowledge Base")));
    }

    @Test
    @DisplayName("Greeting inquiry: simple greeting does not escalate and returns friendly intro")
    void testGreetingDoesNotEscalate() throws Exception {
        mockMvc.perform(post("/kb/chatbot/ask")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(Map.of(
                                "message", "Hello!",
                                "history", Collections.emptyList()
                        ))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.matchedArticleId").doesNotExist())
                .andExpect(jsonPath("$.needsEscalation").value(false))
                .andExpect(jsonPath("$.reply", containsString("UniAssist 360")));
    }
}
