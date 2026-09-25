package com.university.helpdesk.controller;

import com.university.helpdesk.model.KbCategory;
import com.university.helpdesk.model.KnowledgeBaseArticle;
import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.KnowledgeBaseArticleRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.GeminiAiService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/kb")
public class KbController {

    private final KnowledgeBaseArticleRepository articleRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;
    private final GeminiAiService geminiAiService;

    public KbController(KnowledgeBaseArticleRepository articleRepository,
                        TicketRepository ticketRepository,
                        UserRepository userRepository,
                        GeminiAiService geminiAiService) {
        this.articleRepository = articleRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
        this.geminiAiService = geminiAiService;
    }

    // ─── GET ARTICLES (Public read) ──────────────────────────────────────────
    @GetMapping("/articles")
    public ResponseEntity<List<KnowledgeBaseArticle>> getArticles(
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String query,
            @RequestParam(required = false, defaultValue = "false") boolean faqOnly) {

        if (faqOnly) {
            return ResponseEntity.ok(articleRepository.findByIsFaqTrue());
        }

        KbCategory kbCategory = null;
        if (category != null && !category.trim().isEmpty() && !"ALL".equalsIgnoreCase(category)) {
            try {
                kbCategory = KbCategory.valueOf(category.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        List<KnowledgeBaseArticle> articles = articleRepository.filterArticles(kbCategory, query);
        return ResponseEntity.ok(articles);
    }

    // ─── GET ARTICLE BY ID (Public read) ────────────────────────────────────
    @GetMapping("/articles/{id}")
    public ResponseEntity<KnowledgeBaseArticle> getArticleById(@PathVariable Long id) {
        KnowledgeBaseArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));

        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);

        return ResponseEntity.ok(article);
    }

    // ─── CREATE / UPDATE ARTICLE (Knowledge Managers, Admins) ───────────────
    // Author is derived from Authentication — frontend-supplied authorId is ignored
    @PostMapping("/articles")
    @PreAuthorize("hasAnyRole('KNOWLEDGE_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<KnowledgeBaseArticle> saveArticle(@RequestBody Map<String, Object> body,
                                                             Authentication auth) {
        Long id = body.get("id") != null ? Long.valueOf(body.get("id").toString()) : null;
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String categoryStr = (String) body.get("category");
        String keywords = (String) body.get("keywords");
        Boolean isFaq = body.get("isFaq") != null ? Boolean.parseBoolean(body.get("isFaq").toString()) : false;

        if (title == null || title.trim().isEmpty() || content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Content are required");
        }

        // Derive author from authenticated user — NEVER trust frontend-supplied authorId
        User authenticatedUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        KnowledgeBaseArticle article;
        if (id != null) {
            article = articleRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        } else {
            article = new KnowledgeBaseArticle();
            // Only set author on creation — preserve existing author on updates
            article.setAuthor(authenticatedUser);
        }

        article.setTitle(title.trim());
        article.setContent(content.trim());
        article.setKeywords(keywords != null ? keywords.trim() : "");
        article.setFaq(isFaq);

        if (categoryStr != null) {
            try {
                article.setCategory(KbCategory.valueOf(categoryStr.trim().toUpperCase()));
            } catch (IllegalArgumentException e) {
                article.setCategory(KbCategory.IT_SERVICES);
            }
        }

        KnowledgeBaseArticle saved = articleRepository.save(article);
        return ResponseEntity.status(id != null ? HttpStatus.OK : HttpStatus.CREATED).body(saved);
    }

    // ─── DELETE ARTICLE (Knowledge Managers, Admins) ─────────────────────────
    @DeleteMapping("/articles/{id}")
    @PreAuthorize("hasAnyRole('KNOWLEDGE_MANAGER', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteArticle(@PathVariable Long id) {
        if (!articleRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        articleRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── CHATBOT ASK ENDPOINT ────────────────────────────────────────────────
    @PostMapping("/chatbot/ask")
    public ResponseEntity<Map<String, Object>> askChatbot(@RequestBody Map<String, Object> body) {
        String message = (String) body.get("message");
        @SuppressWarnings("unchecked")
        List<Map<String, String>> history = (List<Map<String, String>>) body.get("history");

        Map<String, Object> result = geminiAiService.askChatbot(message, history);
        return ResponseEntity.ok(result);
    }

    // ─── CHATBOT TICKET STATUS (Requires authentication + object-level check) ─
    @GetMapping("/chatbot/ticket-status/{ticketNumber}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<?> getTicketStatus(@PathVariable String ticketNumber, Authentication auth) {
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        Optional<Ticket> ticketOpt = ticketRepository.findByTicketNumber(ticketNumber.trim().toUpperCase());

        if (ticketOpt.isEmpty()) {
            // Try parsing ID if numeric
            try {
                Long id = Long.parseLong(ticketNumber.trim());
                ticketOpt = ticketRepository.findById(id);
            } catch (NumberFormatException ignored) {}
        }

        if (ticketOpt.isEmpty()) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body(Map.of("found", false, "message", "Ticket '" + ticketNumber + "' not found."));
        }

        Ticket t = ticketOpt.get();

        // Object-level access: creator, assigned agent, same-dept staff, or admin
        boolean isAdmin = auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        boolean isCreator = t.getCreatedBy() != null && t.getCreatedBy().getId().equals(currentUser.getId());
        boolean isAssignedAgent = t.getAssignedTo() != null && t.getAssignedTo().getId().equals(currentUser.getId());
        boolean isSameDeptStaff = t.getDepartment() != null && currentUser.getDepartment() != null
                && t.getDepartment().equalsIgnoreCase(currentUser.getDepartment())
                && (currentUser.getRole().name().equals("SUPPORT_AGENT")
                    || currentUser.getRole().name().equals("TEAM_LEAD"));

        if (!isAdmin && !isCreator && !isAssignedAgent && !isSameDeptStaff) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN)
                    .body(Map.of("found", false, "message", "Access denied: You cannot view this ticket's status."));
        }

        return ResponseEntity.ok(Map.of(
                "found", true,
                "ticketNumber", t.getTicketNumber(),
                "title", t.getTitle(),
                "status", t.getStatus().name(),
                "priority", t.getPriority().name(),
                "createdBy", t.getCreatedBy() != null ? t.getCreatedBy().getFullName() : "Unknown",
                "assignedTo", t.getAssignedTo() != null ? t.getAssignedTo().getFullName() : "Unassigned",
                "createdAt", t.getCreatedAt() != null ? t.getCreatedAt().toString() : "",
                "resolutionNotes", t.getResolutionNotes() != null ? t.getResolutionNotes() : ""
        ));
    }
}
