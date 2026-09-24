package com.university.helpdesk.controller;

import com.university.helpdesk.dto.AdminUserCreateRequest;
import com.university.helpdesk.dto.ProfileUpdateRequest;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import com.university.helpdesk.service.PasswordResetService;
import jakarta.validation.Valid;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/users")
@CrossOrigin(origins = "*")
public class UserController {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final PasswordResetService passwordResetService;

    public UserController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder,
                          PasswordResetService passwordResetService) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
        this.passwordResetService = passwordResetService;
    }

    // ─── GET ALL USERS (Administrator only) ───────────────────────────────────
    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ─── GET AGENTS ONLY (Staff and Admins for ticket assignment) ─────────────
    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('TEAM_LEAD', 'SYSTEM_ADMINISTRATOR')")
    public List<User> getAgents(Authentication authentication) {
        List<User> agents = userRepository.findByRole(Role.SUPPORT_AGENT);
        boolean isAdmin = authentication.getAuthorities().stream()
                .anyMatch(authority -> authority.getAuthority().equals("ROLE_SYSTEM_ADMINISTRATOR"));
        if (isAdmin) {
            return agents;
        }

        User teamLead = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (teamLead.getDepartment() == null || teamLead.getDepartment().isBlank()) {
            return List.of();
        }
        return agents.stream()
                .filter(agent -> agent.getDepartment() != null &&
                        agent.getDepartment().equalsIgnoreCase(teamLead.getDepartment()))
                .toList();
    }

    // ─── GET USER BY ID (Administrator only) ──────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    @PutMapping("/{id}/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> updateOwnProfile(@PathVariable Long id,
                                                 @Valid @RequestBody ProfileUpdateRequest request,
                                                 Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!currentUser.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own profile");
        }

        userRepository.findByEmailIgnoreCase(request.getEmail().trim())
                .filter(existing -> !existing.getId().equals(currentUser.getId()))
                .ifPresent(existing -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already registered");
                });

        currentUser.setFullName(request.getFullName().trim());
        currentUser.setEmail(request.getEmail().trim());
        currentUser.setDepartment(normalizeOptional(request.getDepartment()));
        currentUser.setPhoneNumber(normalizeOptional(request.getPhoneNumber()));
        return ResponseEntity.ok(userRepository.save(currentUser));
    }

    @GetMapping("/password-reset-requests")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> getPendingPasswordResetRequests() {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(passwordResetService.getPendingRequests());
    }

    @PostMapping("/password-reset-requests/{requestId}/issue")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> issuePasswordResetCredential(@PathVariable Long requestId) {
        return ResponseEntity.ok()
                .cacheControl(CacheControl.noStore())
                .body(passwordResetService.issueCredential(requestId));
    }

    // ─── CREATE USER (Administrator only) ─────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> createUser(@Valid @RequestBody AdminUserCreateRequest request) {
        String username = request.getUsername().trim();
        String email = request.getEmail().trim();
        if (userRepository.findByUsername(username).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken");
        }
        if (userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already registered");
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(email);
        user.setFullName(request.getFullName().trim());
        user.setRole(request.getRole());
        user.setDepartment(normalizeOptional(request.getDepartment()));
        user.setPhoneNumber(normalizeOptional(request.getPhoneNumber()));
        user.setStatus("ACTIVE");

        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ─── UPDATE USER ROLE (Administrator only) ────────────────────────────────
    @PutMapping("/{id}/role")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
        }

        try {
            Role newRole = Role.valueOf(roleStr.trim().toUpperCase());
            user.setRole(newRole);
            User updated = userRepository.save(user);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleStr);
        }
    }

    // ─── UPDATE USER STATUS (Administrator only) ──────────────────────────────
    @PutMapping("/{id}/status")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        String newStatus;
        if (body != null && body.containsKey("status") && !body.get("status").isBlank()) {
            newStatus = body.get("status").trim().toUpperCase();
        } else {
            // Toggle between ACTIVE and SUSPENDED
            newStatus = "ACTIVE".equalsIgnoreCase(user.getStatus()) ? "SUSPENDED" : "ACTIVE";
        }

        if (!"ACTIVE".equals(newStatus) && !"SUSPENDED".equals(newStatus) && !"INACTIVE".equals(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + newStatus);
        }

        user.setStatus(newStatus);
        user.setTokenVersion(user.getTokenVersion() + 1);
        User updated = userRepository.save(user);
        return ResponseEntity.ok(updated);
    }

    // ─── DELETE USER (Administrator only) ─────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
