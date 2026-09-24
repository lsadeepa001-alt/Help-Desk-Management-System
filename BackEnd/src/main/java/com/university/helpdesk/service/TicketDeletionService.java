package com.university.helpdesk.service;

import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.TicketAttachment;
import com.university.helpdesk.repository.FeedbackRepository;
import com.university.helpdesk.repository.NotificationRepository;
import com.university.helpdesk.repository.TicketAttachmentRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.util.List;

@Service
public class TicketDeletionService {

    private final TicketRepository ticketRepository;
    private final TicketAttachmentRepository attachmentRepository;
    private final TicketCommentRepository commentRepository;
    private final FeedbackRepository feedbackRepository;
    private final NotificationRepository notificationRepository;
    private final AttachmentService attachmentService;

    public TicketDeletionService(TicketRepository ticketRepository,
                                 TicketAttachmentRepository attachmentRepository,
                                 TicketCommentRepository commentRepository,
                                 FeedbackRepository feedbackRepository,
                                 NotificationRepository notificationRepository,
                                 AttachmentService attachmentService) {
        this.ticketRepository = ticketRepository;
        this.attachmentRepository = attachmentRepository;
        this.commentRepository = commentRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.attachmentService = attachmentService;
    }

    @Transactional
    public void permanentlyDelete(Ticket ticket) {
        Long ticketId = ticket.getId();
        List<TicketAttachment> attachments = attachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticketId);

        feedbackRepository.deleteByTicketId(ticketId);
        commentRepository.deleteByTicketId(ticketId);
        attachmentRepository.deleteByTicketId(ticketId);
        notificationRepository.deleteByRelatedTicketId(ticketId);
        ticketRepository.delete(ticket);
        ticketRepository.flush();

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                attachmentService.deletePhysicalFiles(attachments);
            }
        });
    }
}
