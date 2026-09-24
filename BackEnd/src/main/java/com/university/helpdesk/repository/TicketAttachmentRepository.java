package com.university.helpdesk.repository;

import com.university.helpdesk.model.TicketAttachment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface TicketAttachmentRepository extends JpaRepository<TicketAttachment, Long> {

    @Query("SELECT a FROM TicketAttachment a WHERE a.ticket.id = :ticketId ORDER BY a.uploadedAt ASC")
    List<TicketAttachment> findByTicketIdOrderByUploadedAtAsc(@Param("ticketId") Long ticketId);

    @Query("SELECT a FROM TicketAttachment a WHERE a.id = :id AND a.ticket.id = :ticketId")
    Optional<TicketAttachment> findByIdAndTicketId(@Param("id") Long id, @Param("ticketId") Long ticketId);

    @Modifying
    @Query("DELETE FROM TicketAttachment a WHERE a.ticket.id = :ticketId")
    void deleteByTicketId(@Param("ticketId") Long ticketId);
}
