package com.university.helpdesk.repository;

import com.university.helpdesk.model.TicketAssignmentHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketAssignmentHistoryRepository extends JpaRepository<TicketAssignmentHistory, Long> {

    List<TicketAssignmentHistory> findByTicketIdOrderByChangedAtAsc(Long ticketId);

    @Modifying
    @Query("DELETE FROM TicketAssignmentHistory h WHERE h.ticket.id = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}

