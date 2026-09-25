package com.university.helpdesk.controller;

import com.university.helpdesk.model.Feedback;
import com.university.helpdesk.model.Status;
import com.university.helpdesk.model.Ticket;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.FeedbackRepository;
import com.university.helpdesk.repository.TicketRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/feedback")
public class FeedbackController {

    private final FeedbackRepository feedbackRepository;
    private final TicketRepository ticketRepository;
    private final UserRepository userRepository;

    public FeedbackController(FeedbackRepository feedbackRepository,
                              TicketRepository ticketRepository,
                              UserRepository userRepository) {
        this.feedbackRepository = feedbackRepository;
        this.ticketRepository = ticketRepository;
        this.userRepository = userRepository;
    }

    // ─── POST /api/feedback (Students and Lecturers only for own tickets) ───
    @PostMapping
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> submitFeedback(@RequestBody Map<String, Object> body, Authentication auth) {
        // Required fields
        Object ticketIdObj = body.get("ticketId");
        Object ratingObj   = body.get("rating");

        if (ticketIdObj == null || ratingObj == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "ticketId and rating are required");
        }

        Long ticketId = Long.valueOf(ticketIdObj.toString());
        int  rating   = Integer.parseInt(ratingObj.toString());

        if (rating < 1 || rating > 5) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Rating must be between 1 and 5");
        }

        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        if (ticket.getStatus() != Status.RESOLVED && ticket.getStatus() != Status.CLOSED) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Feedback can only be submitted for RESOLVED or CLOSED tickets");
        }

        User submitter = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // Only the ticket creator can submit feedback
        if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(submitter.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Access denied: You can only submit feedback for your own tickets");
        }

        // Prevent duplicate feedback from the same user on the same ticket
        Optional<Feedback> existing = feedbackRepository.findByTicketIdAndSubmittedById(ticketId, submitter.getId());
        if (existing.isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "You have already submitted feedback for this ticket");
        }

        Feedback feedback = new Feedback();
        feedback.setTicket(ticket);
        feedback.setSubmittedBy(submitter);
        feedback.setRating(rating);
        feedback.setComments((String) body.get("comments"));

        Feedback saved = feedbackRepository.save(feedback);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ─── PUT /api/feedback/{id} (Update within 24h window - Student/Lecturer) ─
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> updateFeedback(@PathVariable Long id,
                                            @RequestBody Map<String, Object> body,
                                            Authentication auth) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // IDOR check: must be the customer who submitted feedback
        if (feedback.getSubmittedBy() == null || !feedback.getSubmittedBy().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only edit your own feedback");
        }

        // 24-hour time window check
        if (feedback.getCreatedAt() != null && feedback.getCreatedAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback can only be edited within 24 hours of submission");
        }

        if (body.containsKey("rating") && body.get("rating") != null) {
            int rating = Integer.parseInt(body.get("rating").toString());
            if (rating < 1 || rating > 5) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Rating must be between 1 and 5");
            }
            feedback.setRating(rating);
        }

        if (body.containsKey("comments")) {
            feedback.setComments((String) body.get("comments"));
        }

        Feedback saved = feedbackRepository.save(feedback);
        return ResponseEntity.ok(saved);
    }

    // ─── DELETE /api/feedback/{id} (Withdraw within 24h window - Student/Lecturer)
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER')")
    public ResponseEntity<?> deleteFeedback(@PathVariable Long id, Authentication auth) {
        Feedback feedback = feedbackRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Feedback not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        // IDOR check: must be the customer who submitted feedback
        if (feedback.getSubmittedBy() == null || !feedback.getSubmittedBy().getId().equals(currentUser.getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied: You can only withdraw your own feedback");
        }

        // 24-hour time window check
        if (feedback.getCreatedAt() != null && feedback.getCreatedAt().isBefore(LocalDateTime.now().minusHours(24))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Feedback can only be withdrawn within 24 hours of submission");
        }

        feedbackRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ─── GET /api/feedback/ticket/{ticketId} ────────────────────────────────
    @GetMapping("/ticket/{ticketId}")
    @PreAuthorize("hasAnyRole('STUDENT', 'LECTURER', 'SUPPORT_AGENT', 'TEAM_LEAD', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Feedback>> getFeedbackForTicket(@PathVariable Long ticketId, Authentication auth) {
        Ticket ticket = ticketRepository.findById(ticketId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Ticket not found"));

        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        boolean isAdmin = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        boolean isManager = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_MANAGER_EXECUTIVE"));
        boolean isLead = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEAM_LEAD"));
        boolean isAgent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPPORT_AGENT"));
        boolean isEndUser = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_STUDENT") || a.getAuthority().equals("ROLE_LECTURER"));

        if (isAdmin || isManager) {
            // Authorized for system reporting & oversight
        } else if (isEndUser) {
            if (ticket.getCreatedBy() == null || !ticket.getCreatedBy().getId().equals(currentUser.getId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: You can only view feedback for your own tickets");
            }
        } else if (isAgent) {
            if (ticket.getAssignedTo() == null || !ticket.getAssignedTo().getId().equals(currentUser.getId()) ||
                    ticket.getDepartment() == null || !ticket.getDepartment().equalsIgnoreCase(currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: Support agents can only view feedback for tickets assigned to them in their department");
            }
        } else if (isLead) {
            if (ticket.getDepartment() == null || !ticket.getDepartment().equalsIgnoreCase(currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Access denied: Team leads can only view feedback for tickets in their department");
            }
        } else {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        return ResponseEntity.ok(feedbackRepository.findByTicketId(ticketId));
    }

    // ─── GET /api/feedback/agent/{agentId}/summary ──────────────────────────
    @GetMapping("/agent/{agentId}/summary")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'TEAM_LEAD', 'MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getAgentSummary(@PathVariable Long agentId, Authentication auth) {
        User currentUser = userRepository.findByUsername(auth.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        User agent = userRepository.findById(agentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Agent not found"));

        boolean isSupportAgent = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_SUPPORT_AGENT"));
        boolean isTeamLead = auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEAM_LEAD"));
        boolean isManagerOrAdmin = auth.getAuthorities().stream().anyMatch(a ->
                a.getAuthority().equals("ROLE_MANAGER_EXECUTIVE") || a.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));

        if (isSupportAgent) {
            if (!currentUser.getId().equals(agentId)) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Support agents can only view their own performance summary");
            }
        } else if (isTeamLead) {
            if (agent.getDepartment() == null || !agent.getDepartment().equalsIgnoreCase(currentUser.getDepartment())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Team leads can only view feedback summaries for agents in their department");
            }
        } else if (!isManagerOrAdmin) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Access denied");
        }

        List<Feedback> list = feedbackRepository.findByAgentId(agentId);
        return ResponseEntity.ok(buildSummary(agent.getFullName(), agent.getRole().name(),
                agent.getDepartment(), list));
    }

    // ─── GET /api/feedback/department/{department} (Managers & Admins) ────────
    @GetMapping("/department/{department}")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Map<String, Object>> getDepartmentStats(@PathVariable String department) {
        List<Feedback> list = feedbackRepository.findByDepartment(department);
        return ResponseEntity.ok(buildSummary(department, "DEPARTMENT", department, list));
    }

    // ─── GET /api/feedback/all (Managers & Admins) ───────────────────────────
    @GetMapping("/all")
    @PreAuthorize("hasAnyRole('MANAGER_EXECUTIVE', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<List<Feedback>> getAllFeedback() {
        return ResponseEntity.ok(feedbackRepository.findAll());
    }

    // ─── Helper: build summary map ──────────────────────────────────────────
    private Map<String, Object> buildSummary(String name, String role,
                                             String department, List<Feedback> list) {
        Map<String, Object> result = new LinkedHashMap<>();
        result.put("name", name);
        result.put("role", role);
        result.put("department", department);
        result.put("totalFeedback", list.size());
        result.put("totalReviews", list.size());

        if (list.isEmpty()) {
            result.put("avgRating", 0.0);
            result.put("averageRating", 0.0);
            result.put("csatScore", 0.0);      // % ratings >= 4
            result.put("ratingBreakdown", Map.of(1,0,2,0,3,0,4,0,5,0));
            result.put("reviews", Collections.emptyList());
            return result;
        }

        double avg = list.stream().mapToInt(Feedback::getRating).average().orElse(0.0);
        long satisfied = list.stream().filter(f -> f.getRating() >= 4).count();
        double csat = (satisfied * 100.0) / list.size();

        // Rating breakdown 1–5
        Map<Integer, Long> breakdown = list.stream()
                .collect(Collectors.groupingBy(Feedback::getRating, Collectors.counting()));
        Map<Integer, Long> fullBreakdown = new LinkedHashMap<>();
        for (int i = 1; i <= 5; i++) fullBreakdown.put(i, breakdown.getOrDefault(i, 0L));

        // Recent reviews (up to 20, newest first) – avoid serialising full Ticket graph
        List<Map<String, Object>> reviews = list.stream()
                .sorted(Comparator.comparing(f -> f.getCreatedAt() == null ? "" : f.getCreatedAt().toString(),
                        Comparator.reverseOrder()))
                .limit(20)
                .map(f -> {
                    Map<String, Object> r = new LinkedHashMap<>();
                    r.put("id", f.getId());
                    r.put("rating", f.getRating());
                    r.put("comments", f.getComments());
                    r.put("createdAt", f.getCreatedAt());
                    r.put("submittedBy", Map.of(
                            "id", f.getSubmittedBy().getId(),
                            "fullName", f.getSubmittedBy().getFullName(),
                            "role", f.getSubmittedBy().getRole().name()
                    ));
                    r.put("ticketNumber", f.getTicket().getTicketNumber());
                    r.put("ticketTitle", f.getTicket().getTitle());
                    return r;
                })
                .collect(Collectors.toList());

        double roundedAvg = Math.round(avg * 10.0) / 10.0;
        result.put("avgRating", roundedAvg);
        result.put("averageRating", roundedAvg);
        result.put("csatScore", Math.round(csat * 10.0) / 10.0);
        result.put("ratingBreakdown", fullBreakdown);
        result.put("reviews", reviews);
        return result;
    }
}
