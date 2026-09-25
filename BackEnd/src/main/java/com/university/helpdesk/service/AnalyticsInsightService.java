package com.university.helpdesk.service;

import com.university.helpdesk.dto.AnalyticsInsightDTO;
import com.university.helpdesk.model.AnalyticsInsight;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.AnalyticsInsightRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@Transactional
public class AnalyticsInsightService {

    private final AnalyticsInsightRepository analyticsInsightRepository;

    public AnalyticsInsightService(AnalyticsInsightRepository analyticsInsightRepository) {
        this.analyticsInsightRepository = analyticsInsightRepository;
    }

    @Transactional(readOnly = true)
    public List<AnalyticsInsightDTO> getInsights() {
        return analyticsInsightRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(AnalyticsInsightDTO::from)
                .toList();
    }

    public AnalyticsInsightDTO createInsight(String title, String content, User author) {
        if (author == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not authenticated");
        }
        if (content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content is required");
        }

        AnalyticsInsight insight = new AnalyticsInsight();
        insight.setAuthor(author);
        insight.setAuthorName(author.getFullName() != null && !author.getFullName().isBlank()
                ? author.getFullName() : author.getUsername());
        insight.setAuthorRole(author.getRole());
        insight.setDepartment(author.getDepartment());
        if (title != null && !title.isBlank()) {
            insight.setTitle(title.trim().length() > 200 ? title.trim().substring(0, 200) : title.trim());
        }
        insight.setContent(content.trim().length() > 4000 ? content.trim().substring(0, 4000) : content.trim());
        insight.setCreatedAt(LocalDateTime.now());
        insight.setUpdatedAt(insight.getCreatedAt());

        AnalyticsInsight saved = analyticsInsightRepository.save(insight);
        return AnalyticsInsightDTO.from(saved);
    }

    public AnalyticsInsightDTO updateInsight(Long id, String title, String content, User currentUser, boolean isAdmin) {
        AnalyticsInsight insight = analyticsInsightRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insight not found"));

        if (!isAdmin && !insight.getAuthor().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only edit your own insights");
        }

        if (content == null || content.trim().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Content is required");
        }

        if (title != null) {
            insight.setTitle(title.trim().length() > 200 ? title.trim().substring(0, 200) : title.trim());
        }
        insight.setContent(content.trim().length() > 4000 ? content.trim().substring(0, 4000) : content.trim());
        insight.setUpdatedAt(LocalDateTime.now());

        AnalyticsInsight updated = analyticsInsightRepository.save(insight);
        return AnalyticsInsightDTO.from(updated);
    }

    public void deleteInsight(Long id, User currentUser, boolean isAdmin) {
        AnalyticsInsight insight = analyticsInsightRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Insight not found"));

        if (!isAdmin && !insight.getAuthor().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only delete your own insights");
        }

        analyticsInsightRepository.delete(insight);
    }
}
