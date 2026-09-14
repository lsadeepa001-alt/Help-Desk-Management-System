package com.university.helpdesk.repository;

import com.university.helpdesk.model.KbCategory;
import com.university.helpdesk.model.KnowledgeBaseArticle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface KnowledgeBaseArticleRepository extends JpaRepository<KnowledgeBaseArticle, Long> {

    List<KnowledgeBaseArticle> findByCategory(KbCategory category);

    List<KnowledgeBaseArticle> findByIsFaqTrue();

    @Query("SELECT a FROM KnowledgeBaseArticle a WHERE " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.content) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.keywords) LIKE LOWER(CONCAT('%', :query, '%'))")
    List<KnowledgeBaseArticle> searchArticles(@Param("query") String query);

    @Query("SELECT a FROM KnowledgeBaseArticle a WHERE " +
           "(:category IS NULL OR a.category = :category) AND " +
           "(:query IS NULL OR :query = '' OR " +
           "LOWER(a.title) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.content) LIKE LOWER(CONCAT('%', :query, '%')) OR " +
           "LOWER(a.keywords) LIKE LOWER(CONCAT('%', :query, '%')))")
    List<KnowledgeBaseArticle> filterArticles(@Param("category") KbCategory category, @Param("query") String query);
}
