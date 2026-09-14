package com.university.helpdesk.repository;

import com.university.helpdesk.model.Priority;
import com.university.helpdesk.model.Status;
import com.university.helpdesk.model.Ticket;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketRepository extends JpaRepository<Ticket, Long> {
    List<Ticket> findByCreatedById(Long userId);
    List<Ticket> findByAssignedToId(Long agentId);
    List<Ticket> findByStatus(Status status);
    List<Ticket> findByPriority(Priority priority);
    Optional<Ticket> findByTicketNumber(String ticketNumber);
}
