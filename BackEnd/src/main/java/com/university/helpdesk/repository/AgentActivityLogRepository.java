package com.university.helpdesk.repository;

import com.university.helpdesk.model.AgentActivityLog;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AgentActivityLogRepository extends JpaRepository<AgentActivityLog, Long> {

    List<AgentActivityLog> findAllByOrderByCreatedAtDesc();

    List<AgentActivityLog> findByTicketIdOrderByCreatedAtDesc(Long ticketId);

    List<AgentActivityLog> findByActorIdOrderByCreatedAtDesc(Long actorId);

    void deleteByTicketId(Long ticketId);
}
