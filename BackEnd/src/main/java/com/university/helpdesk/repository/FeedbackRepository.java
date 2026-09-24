package com.university.helpdesk.repository;

import com.university.helpdesk.model.Feedback;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackRepository extends JpaRepository<Feedback, Long> {

    List<Feedback> findByTicketId(Long ticketId);

    Optional<Feedback> findByTicketIdAndSubmittedById(Long ticketId, Long userId);

    @Modifying
    @Query("DELETE FROM Feedback f WHERE f.ticket.id = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);

    // All feedback for tickets assigned to a specific agent
    @Query("SELECT f FROM Feedback f WHERE f.ticket.assignedTo.id = :agentId")
    List<Feedback> findByAgentId(@Param("agentId") Long agentId);

    // All feedback for tickets belonging to a given department
    @Query("SELECT f FROM Feedback f WHERE " +
           "f.ticket.department = :dept OR f.ticket.createdBy.department = :dept")
    List<Feedback> findByDepartment(@Param("dept") String department);
}
