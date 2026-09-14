package com.university.helpdesk.controller;

import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    public UserController(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    // ─── GET ALL USERS (Administrator only) ───────────────────────────────────
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

    // ─── GET AGENTS ONLY (Staff, Managers, and Admins for assignment) ─────────
    @GetMapping("/agents")
    @PreAuthorize("hasAnyRole('SUPPORT_AGENT', 'DEPARTMENT_MANAGER', 'ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public List<User> getAgents() {
        List<User> agents = userRepository.findByRole(Role.SUPPORT_AGENT);
        agents.addAll(userRepository.findByRole(Role.ADMIN));
        return agents;
    }

    // ─── GET USER BY ID (Administrator only) ──────────────────────────────────
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    // ─── CREATE USER (Administrator only) ─────────────────────────────────────
    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> createUser(@RequestBody User user) {
        if (user.getUsername() == null || user.getUsername().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is required");
        }
        if (userRepository.findByUsername(user.getUsername()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken");
        }
        if (user.getEmail() != null && userRepository.findByEmail(user.getEmail()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already registered");
        }

        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            user.setPassword(passwordEncoder.encode(user.getPassword()));
        } else {
            user.setPassword(passwordEncoder.encode("password123"));
        }

        if (user.getRole() == null) {
            user.setRole(Role.STUDENT);
        }
        if (user.getStatus() == null) {
            user.setStatus("ACTIVE");
        }

        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    // ─── UPDATE USER ROLE (Administrator only) ────────────────────────────────
    @PutMapping("/{id}/role")
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
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
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
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
        User updated = userRepository.save(user);
        return ResponseEntity.ok(updated);
    }

    // ─── DELETE USER (Administrator only) ─────────────────────────────────────
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        if (!userRepository.existsById(id)) {
            return ResponseEntity.notFound().build();
        }
        userRepository.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}
