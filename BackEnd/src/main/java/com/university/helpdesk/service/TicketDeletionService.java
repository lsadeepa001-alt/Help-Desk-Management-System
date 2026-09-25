package com.university.helpdesk.service;

import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.TicketAttachment;
import com.university.helpdesk.repository.*;
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
    private final TicketAssignmentHistoryRepository assignmentHistoryRepository;
    private final AgentActivityLogRepository agentActivityLogRepository;

    public TicketDeletionService(TicketRepository ticketRepository,
                                 TicketAttachmentRepository attachmentRepository,
                                 TicketCommentRepository commentRepository,
                                 FeedbackRepository feedbackRepository,
                                 NotificationRepository notificationRepository,
                                 AttachmentService attachmentService,
                                 TicketAssignmentHistoryRepository assignmentHistoryRepository,
                                 AgentActivityLogRepository agentActivityLogRepository) {
        this.ticketRepository = ticketRepository;
        this.attachmentRepository = attachmentRepository;
        this.commentRepository = commentRepository;
        this.feedbackRepository = feedbackRepository;
        this.notificationRepository = notificationRepository;
        this.attachmentService = attachmentService;
        this.assignmentHistoryRepository = assignmentHistoryRepository;
        this.agentActivityLogRepository = agentActivityLogRepository;
    }

    @Transactional
    public void permanentlyDelete(Ticket ticket) {
        Long ticketId = ticket.getId();
        List<TicketAttachment> attachments = attachmentRepository.findByTicketIdOrderByUploadedAtAsc(ticketId);

        agentActivityLogRepository.deleteByTicketId(ticketId);
        assignmentHistoryRepository.deleteByTicketId(ticketId);
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
