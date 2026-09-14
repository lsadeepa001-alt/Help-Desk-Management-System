package com.university.helpdesk.model;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "kb_articles")
public class KnowledgeBaseArticle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private KbCategory category = KbCategory.IT_SERVICES;

    @Column(length = 255)
    private String keywords;

    @Column(name = "view_count", nullable = false)
    private int viewCount = 0;

    @Column(name = "is_faq", nullable = false)
    private boolean isFaq = false;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "author_id")
    @JsonIgnoreProperties({"hibernateLazyInitializer", "handler", "password"})
    private User author;

    @Column(name = "created_at", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", insertable = false, updatable = false)
    private LocalDateTime updatedAt;

    public KnowledgeBaseArticle() {}

    public KnowledgeBaseArticle(String title, String content, KbCategory category, String keywords, boolean isFaq, User author) {
        this.title = title;
        this.content = content;
        this.category = category;
        this.keywords = keywords;
        this.isFaq = isFaq;
        this.author = author;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getTitle() { return title; }
    public void setTitle(String title) { this.title = title; }

    public String getContent() { return content; }
    public void setContent(String content) { this.content = content; }

    public KbCategory getCategory() { return category; }
    public void setCategory(KbCategory category) { this.category = category; }

    public String getKeywords() { return keywords; }
    public void setKeywords(String keywords) { this.keywords = keywords; }

    public int getViewCount() { return viewCount; }
    public void setViewCount(int viewCount) { this.viewCount = viewCount; }

    public boolean isFaq() { return isFaq; }
    public void setFaq(boolean faq) { isFaq = faq; }

    public User getAuthor() { return author; }
    public void setAuthor(User author) { this.author = author; }

    public LocalDateTime getCreatedAt() { return createdAt; }
    public void setCreatedAt(LocalDateTime createdAt) { this.createdAt = createdAt; }

    public LocalDateTime getUpdatedAt() { return updatedAt; }
    public void setUpdatedAt(LocalDateTime updatedAt) { this.updatedAt = updatedAt; }
}
