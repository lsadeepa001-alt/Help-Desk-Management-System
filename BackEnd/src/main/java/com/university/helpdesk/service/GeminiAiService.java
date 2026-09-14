package com.university.helpdesk.service;

import com.university.helpdesk.model.KnowledgeBaseArticle;
import com.university.helpdesk.repository.KnowledgeBaseArticleRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Collectors;

@Service
public class GeminiAiService {

    @Value("${gemini.api.key:}")
    private String apiKey;

    private final KnowledgeBaseArticleRepository articleRepository;
    private final RestTemplate restTemplate;

    private static final String SYSTEM_PROMPT =
        "You are UniAssist 360, the intelligent Help Desk AI for the University. " +
        "Your task is to resolve student and staff technical issues concisely and politely. " +
        "Reference university guidelines where applicable. " +
        "If an issue requires manual intervention by IT technicians (e.g. broken hardware, account ban, physical repair), advise the user to submit a ticket.";

    public GeminiAiService(KnowledgeBaseArticleRepository articleRepository) {
        this.articleRepository = articleRepository;
        this.restTemplate = new RestTemplate();
    }

    public Map<String, Object> askChatbot(String userMessage, List<Map<String, String>> history) {
        Map<String, Object> response = new HashMap<>();

        if (userMessage == null || userMessage.trim().isEmpty()) {
            response.put("reply", "Hello! I am UniAssist 360. How can I help you today with university IT or campus services?");
            response.put("matchedArticleId", null);
            response.put("canDeflect", false);
            return response;
        }

        // Search KB using exact match or smart keyword token matching
        List<KnowledgeBaseArticle> matchingArticles = findMatchingArticles(userMessage.trim());
        KnowledgeBaseArticle bestMatch = matchingArticles.isEmpty() ? null : matchingArticles.get(0);

        String replyText = null;

        // Try calling Google Gemini API if key is present
        if (apiKey != null && !apiKey.trim().isEmpty()) {
            replyText = tryGeminiApi(userMessage, history, matchingArticles);
        }

        // If Gemini API wasn't configured or failed, use smart local KB engine
        if (replyText == null || replyText.trim().isEmpty()) {
            replyText = generateFallbackResponse(userMessage, bestMatch);
        }

        boolean canDeflect = bestMatch != null || userMessage.toLowerCase().contains("ticket") || userMessage.toLowerCase().contains("help");

        response.put("reply", replyText);
        response.put("matchedArticleId", bestMatch != null ? bestMatch.getId() : null);
        response.put("matchedArticleTitle", bestMatch != null ? bestMatch.getTitle() : null);
        response.put("canDeflect", canDeflect);

        return response;
    }

    private List<KnowledgeBaseArticle> findMatchingArticles(String query) {
        // Try direct query search first
        List<KnowledgeBaseArticle> directMatches = articleRepository.searchArticles(query);
        if (!directMatches.isEmpty()) return directMatches;

        // Otherwise tokenize query words (>3 chars) and match against all KB articles
        List<KnowledgeBaseArticle> allArticles = articleRepository.findAll();
        String[] tokens = query.toLowerCase().split("[\\s,\\.\\?\\!\\-]+");

        Map<KnowledgeBaseArticle, Integer> articleScores = new HashMap<>();
        for (KnowledgeBaseArticle article : allArticles) {
            int score = 0;
            String titleLower = article.getTitle().toLowerCase();
            String contentLower = article.getContent().toLowerCase();
            String keywordsLower = article.getKeywords() != null ? article.getKeywords().toLowerCase() : "";

            for (String token : tokens) {
                if (token.length() < 3 || isStopWord(token)) continue;
                if (keywordsLower.contains(token)) score += 5;
                if (titleLower.contains(token)) score += 3;
                if (contentLower.contains(token)) score += 1;
            }

            if (score > 0) {
                articleScores.put(article, score);
            }
        }

        return articleScores.entrySet().stream()
                .sorted(Map.Entry.<KnowledgeBaseArticle, Integer>comparingByValue().reversed())
                .map(Map.Entry::getKey)
                .collect(Collectors.toList());
    }

    private boolean isStopWord(String word) {
        Set<String> stops = Set.of("the", "and", "how", "what", "can", "does", "with", "from", "this", "that", "have", "you", "your", "for", "are");
        return stops.contains(word);
    }

    private String tryGeminiApi(String userMessage, List<Map<String, String>> history, List<KnowledgeBaseArticle> matchingArticles) {
        String[] models = {"gemini-2.5-flash", "gemini-1.5-flash-latest", "gemini-1.5-pro-latest", "gemini-flash", "gemini-pro"};
        for (String model : models) {
            try {
                String reply = callGeminiModel(model, userMessage, history, matchingArticles);
                if (reply != null && !reply.trim().isEmpty()) {
                    return reply;
                }
            } catch (Exception e) {
                System.err.println("Gemini model (" + model + ") call failed: " + e.getMessage());
            }
        }
        return null;
    }

    private String callGeminiModel(String model, String userMessage, List<Map<String, String>> history, List<KnowledgeBaseArticle> matchingArticles) {
        String url = "https://generativelanguage.googleapis.com/v1beta/models/" + model + ":generateContent?key=" + apiKey.trim();

        StringBuilder promptBuilder = new StringBuilder();
        promptBuilder.append(SYSTEM_PROMPT).append("\n\n");

        if (!matchingArticles.isEmpty()) {
            promptBuilder.append("Relevant University Knowledge Base Articles:\n");
            for (KnowledgeBaseArticle article : matchingArticles.stream().limit(3).collect(Collectors.toList())) {
                promptBuilder.append("--- Article: ").append(article.getTitle()).append(" ---\n");
                promptBuilder.append(article.getContent()).append("\n\n");
            }
        }

        if (history != null && !history.isEmpty()) {
            promptBuilder.append("Conversation History:\n");
            for (Map<String, String> msg : history) {
                promptBuilder.append(msg.getOrDefault("sender", "user")).append(": ").append(msg.getOrDefault("text", "")).append("\n");
            }
        }

        promptBuilder.append("User Query: ").append(userMessage).append("\n");

        Map<String, Object> requestBody = new HashMap<>();
        List<Map<String, Object>> contents = new ArrayList<>();
        Map<String, Object> contentMap = new HashMap<>();
        contentMap.put("role", "user");

        List<Map<String, String>> parts = new ArrayList<>();
        Map<String, String> part = new HashMap<>();
        part.put("text", promptBuilder.toString());
        parts.add(part);

        contentMap.put("parts", parts);
        contents.add(contentMap);
        requestBody.put("contents", contents);

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);

        HttpEntity<Map<String, Object>> entity = new HttpEntity<>(requestBody, headers);

        Map<?, ?> result = restTemplate.postForObject(url, entity, Map.class);
        if (result != null && result.containsKey("candidates")) {
            List<?> candidates = (List<?>) result.get("candidates");
            if (!candidates.isEmpty()) {
                Map<?, ?> candidate = (Map<?, ?>) candidates.get(0);
                Map<?, ?> candidateContent = (Map<?, ?>) candidate.get("content");
                List<?> resParts = (List<?>) candidateContent.get("parts");
                if (resParts != null && !resParts.isEmpty()) {
                    Map<?, ?> firstPart = (Map<?, ?>) resParts.get(0);
                    return (String) firstPart.get("text");
                }
            }
        }

        return null;
    }

    private String generateFallbackResponse(String userMessage, KnowledgeBaseArticle bestMatch) {
        String msgLower = userMessage.toLowerCase();

        if (bestMatch != null) {
            return "Based on your inquiry, here is the step-by-step solution from our University Knowledge Base:\n\n" +
                   "📌 **" + bestMatch.getTitle() + "**\n\n" +
                   bestMatch.getContent() + "\n\n" +
                   "Does this step-by-step solution resolve your issue?";
        }

        if (msgLower.contains("hello") || msgLower.contains("hi") || msgLower.contains("hey")) {
            return "Hello! I am UniAssist 360, your University Help Desk Assistant. You can ask me about Wi-Fi, LMS password resets, software licenses, lab PCs, library access, or hostel maintenance!";
        }

        if (msgLower.contains("ticket") || msgLower.contains("issue") || msgLower.contains("status")) {
            return "You can check the status of your existing ticket using the Ticket Status command, or submit a new ticket directly to our IT support technicians.";
        }

        return "I reviewed your question regarding: '" + userMessage + "'.\n\n" +
               "If your issue requires technical intervention by an IT support agent or physical repair, please click 'No, Create Ticket' below to submit a formal support request.";
    }
}
