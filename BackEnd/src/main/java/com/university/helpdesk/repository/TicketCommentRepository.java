package com.university.helpdesk.repository;

import com.university.helpdesk.model.TicketComment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TicketCommentRepository extends JpaRepository<TicketComment, Long> {
    List<TicketComment> findByTicketIdOrderByCreatedAtAsc(Long ticketId);
    List<TicketComment> findByTicketIdAndIsInternalFalseOrderByCreatedAtAsc(Long ticketId);
    @Modifying
    @Query("DELETE FROM TicketComment c WHERE c.ticket.id = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}
