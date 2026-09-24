package com.university.helpdesk;

import com.university.helpdesk.model.Priority;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.Status;
import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.TicketAttachment;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.FeedbackRepository;
import com.university.helpdesk.repository.NotificationRepository;
import com.university.helpdesk.repository.TicketAttachmentRepository;
import com.university.helpdesk.repository.TicketCommentRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.security.JwtUtils;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.UUID;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
class TicketCancellationSecurityTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private TicketRepository ticketRepository;

    @Autowired
    private TicketAttachmentRepository attachmentRepository;

    @Autowired
    private TicketCommentRepository commentRepository;

    @Autowired
    private FeedbackRepository feedbackRepository;

    @Autowired
    private NotificationRepository notificationRepository;

    @Autowired
    private JwtUtils jwtUtils;

    @BeforeEach
    void cleanTicketData() {
        feedbackRepository.deleteAll();
        attachmentRepository.deleteAll();
        commentRepository.deleteAll();
        ticketRepository.deleteAll();
    }

    @Test
    @DisplayName("System Administrator soft-cancels an OPEN ticket without deleting its attachments")
    void administratorCanSoftCancelOpenTicketWithAttachment() throws Exception {
        User administrator = createUser(Role.SYSTEM_ADMINISTRATOR);
        Ticket ticket = createTicket(administrator, Status.OPEN);
        TicketAttachment attachment = createAttachment(ticket, administrator);

        mockMvc.perform(delete("/tickets/" + ticket.getId())
                        .header("Authorization", bearerToken(administrator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertEquals(Status.CANCELLED, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
        assertTrue(attachmentRepository.existsById(attachment.getId()));
    }

    @Test
    @DisplayName("System Administrator rejects another user's OPEN ticket")
    void administratorRejectsAnotherUsersOpenTicket() throws Exception {
        User owner = createUser(Role.STUDENT);
        User administrator = createUser(Role.SYSTEM_ADMINISTRATOR);
        Ticket ticket = createTicket(owner, Status.OPEN);

        mockMvc.perform(delete("/tickets/" + ticket.getId())
                        .header("Authorization", bearerToken(administrator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("REJECTED"));

        assertEquals(Status.REJECTED, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
        assertTrue(notificationRepository.findByRecipientIdOrderByCreatedAtDesc(owner.getId()).stream()
                .anyMatch(notification -> notification.getMessage().contains("REJECTED")));

        mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                        .header("Authorization", bearerToken(administrator))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"status\":\"OPEN\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Terminal tickets cannot be moved to another status"));
    }

    @Test
    @DisplayName("Student ticket creator can cancel their own OPEN ticket")
    void studentCreatorCanCancelOwnOpenTicket() throws Exception {
        assertCreatorCanCancel(Role.STUDENT);
    }

    @Test
    @DisplayName("Lecturer ticket creator can cancel their own OPEN ticket")
    void lecturerCreatorCanCancelOwnOpenTicket() throws Exception {
        assertCreatorCanCancel(Role.LECTURER);
    }

    @Test
    @DisplayName("Student and Lecturer cannot cancel or reject another user's ticket")
    void studentAndLecturerCannotCancelAnotherUsersTicket() throws Exception {
        User owner = createUser(Role.STUDENT);
        Ticket ticket = createTicket(owner, Status.OPEN);

        for (Role role : new Role[]{Role.STUDENT, Role.LECTURER}) {
            User unrelatedUser = createUser(role);
            mockMvc.perform(delete("/tickets/" + ticket.getId())
                            .header("Authorization", bearerToken(unrelatedUser)))
                    .andExpect(status().isForbidden())
                    .andExpect(jsonPath("$.message").value("Access denied: You can only cancel your own tickets"));
        }

        assertEquals(Status.OPEN, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Support and management roles cannot use the ticket cancellation endpoint")
    void unauthorizedRolesCannotCancelTickets() throws Exception {
        User owner = createUser(Role.STUDENT);
        Ticket ticket = createTicket(owner, Status.OPEN);

        for (Role role : new Role[]{Role.SUPPORT_AGENT, Role.TEAM_LEAD, Role.KNOWLEDGE_MANAGER, Role.MANAGER_EXECUTIVE}) {
            User unauthorizedUser = createUser(role);
            mockMvc.perform(delete("/tickets/" + ticket.getId())
                            .header("Authorization", bearerToken(unauthorizedUser)))
                    .andExpect(status().isForbidden());

            if (role == Role.SUPPORT_AGENT || role == Role.TEAM_LEAD) {
                mockMvc.perform(put("/tickets/" + ticket.getId() + "/status")
                                .header("Authorization", bearerToken(unauthorizedUser))
                                .contentType(MediaType.APPLICATION_JSON)
                                .content("{\"status\":\"REJECTED\"}"))
                        .andExpect(status().isBadRequest())
                        .andExpect(jsonPath("$.message").value("This status requires its dedicated workflow action"));
            }
        }

        assertEquals(Status.OPEN, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Unauthenticated requests cannot cancel tickets")
    void unauthenticatedRequestCannotCancelTicket() throws Exception {
        User owner = createUser(Role.STUDENT);
        Ticket ticket = createTicket(owner, Status.OPEN);

        mockMvc.perform(delete("/tickets/" + ticket.getId()))
                .andExpect(status().isForbidden());

        assertEquals(Status.OPEN, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
    }

    @Test
    @DisplayName("Neither creator nor administrator can cancel a ticket that is not OPEN")
    void nonOpenTicketsCannotBeCancelled() throws Exception {
        User student = createUser(Role.STUDENT);
        User administrator = createUser(Role.SYSTEM_ADMINISTRATOR);
        Ticket inProgressTicket = createTicket(student, Status.IN_PROGRESS);
        Ticket resolvedTicket = createTicket(student, Status.RESOLVED);

        mockMvc.perform(delete("/tickets/" + inProgressTicket.getId())
                        .header("Authorization", bearerToken(student)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only OPEN tickets can be cancelled or rejected"));

        mockMvc.perform(delete("/tickets/" + resolvedTicket.getId())
                        .header("Authorization", bearerToken(administrator)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Only OPEN tickets can be cancelled or rejected"));

        assertEquals(Status.IN_PROGRESS, ticketRepository.findById(inProgressTicket.getId()).orElseThrow().getStatus());
        assertEquals(Status.RESOLVED, ticketRepository.findById(resolvedTicket.getId()).orElseThrow().getStatus());
    }

    private void assertCreatorCanCancel(Role role) throws Exception {
        User creator = createUser(role);
        Ticket ticket = createTicket(creator, Status.OPEN);

        mockMvc.perform(delete("/tickets/" + ticket.getId())
                        .header("Authorization", bearerToken(creator)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("CANCELLED"));

        assertEquals(Status.CANCELLED, ticketRepository.findById(ticket.getId()).orElseThrow().getStatus());
    }

    private User createUser(Role role) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        User user = new User();
        user.setUsername(role.name().toLowerCase() + "_" + suffix);
        user.setPassword("not-used-by-jwt-tests");
        user.setEmail(role.name().toLowerCase() + "." + suffix + "@test.invalid");
        user.setFullName(role.name() + " Test User");
        user.setRole(role);
        user.setStatus("ACTIVE");
        return userRepository.save(user);
    }

    private Ticket createTicket(User creator, Status status) {
        Ticket ticket = new Ticket();
        ticket.setTicketNumber("TICK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 12));
        ticket.setTitle("Cancellation security test");
        ticket.setDescription("Ticket created for direct API authorization testing.");
        ticket.setPriority(Priority.MEDIUM);
        ticket.setStatus(status);
        ticket.setCreatedBy(creator);
        return ticketRepository.save(ticket);
    }

    private TicketAttachment createAttachment(Ticket ticket, User uploader) {
        String suffix = UUID.randomUUID().toString();
        TicketAttachment attachment = new TicketAttachment();
        attachment.setTicket(ticket);
        attachment.setUploadedBy(uploader);
        attachment.setOriginalFileName("evidence.txt");
        attachment.setStoredFileName(suffix + ".txt");
        attachment.setContentType("text/plain");
        attachment.setFileSize(8L);
        attachment.setStoragePath("target/test-uploads/" + suffix + ".txt");
        return attachmentRepository.save(attachment);
    }

    private String bearerToken(User user) {
        return "Bearer " + jwtUtils.generateToken(user);
    }
}
