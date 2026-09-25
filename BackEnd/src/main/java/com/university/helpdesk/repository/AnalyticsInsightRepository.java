package com.university.helpdesk.repository;

import com.university.helpdesk.model.AnalyticsInsight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AnalyticsInsightRepository extends JpaRepository<AnalyticsInsight, Long> {

    List<AnalyticsInsight> findAllByOrderByCreatedAtDesc();

    List<AnalyticsInsight> findByAuthorIdOrderByCreatedAtDesc(Long authorId);
}
