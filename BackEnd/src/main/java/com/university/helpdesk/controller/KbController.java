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
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@RestController
@RequestMapping("/kb")
@CrossOrigin(origins = "*")
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

    // ─── GET ARTICLES ────────────────────────────────────────────────────────
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

    // ─── GET ARTICLE BY ID ───────────────────────────────────────────────────
    @GetMapping("/articles/{id}")
    public ResponseEntity<KnowledgeBaseArticle> getArticleById(@PathVariable Long id) {
        KnowledgeBaseArticle article = articleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));

        article.setViewCount(article.getViewCount() + 1);
        articleRepository.save(article);

        return ResponseEntity.ok(article);
    }

    // ─── CREATE / UPDATE ARTICLE (Staff, Managers, Admins) ──────────────────
    @PostMapping("/articles")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<KnowledgeBaseArticle> saveArticle(@RequestBody Map<String, Object> body) {
        Long id = body.get("id") != null ? Long.valueOf(body.get("id").toString()) : null;
        String title = (String) body.get("title");
        String content = (String) body.get("content");
        String categoryStr = (String) body.get("category");
        String keywords = (String) body.get("keywords");
        Boolean isFaq = body.get("isFaq") != null ? Boolean.parseBoolean(body.get("isFaq").toString()) : false;
        Long authorId = body.get("authorId") != null ? Long.valueOf(body.get("authorId").toString()) : null;

        if (title == null || title.trim().isEmpty() || content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Title and Content are required");
        }

        KnowledgeBaseArticle article;
        if (id != null) {
            article = articleRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Article not found"));
        } else {
            article = new KnowledgeBaseArticle();
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

        if (authorId != null) {
            User author = userRepository.findById(authorId).orElse(null);
            article.setAuthor(author);
        } else if (article.getAuthor() == null) {
            userRepository.findAll().stream().findFirst().ifPresent(article::setAuthor);
        }

        KnowledgeBaseArticle saved = articleRepository.save(article);
        return ResponseEntity.status(id != null ? HttpStatus.OK : HttpStatus.CREATED).body(saved);
    }

    // ─── DELETE ARTICLE (Staff, Managers, Admins) ────────────────────────────
    @DeleteMapping("/articles/{id}")
    @org.springframework.security.access.prepost.PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
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

    // ─── CHATBOT TICKET STATUS ENDPOINT ──────────────────────────────────────
    @GetMapping("/chatbot/ticket-status/{ticketNumber}")
    public ResponseEntity<?> getTicketStatus(@PathVariable String ticketNumber) {
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
