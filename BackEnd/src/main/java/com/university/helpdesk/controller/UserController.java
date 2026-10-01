package com.university.helpdesk.controller;

import com.university.helpdesk.dto.AdminUserCreateRequest;
import com.university.helpdesk.dto.AdminUserUpdateRequest;
import com.university.helpdesk.dto.ProfileUpdateRequest;
import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;

@RestController
@RequestMapping("/users")
public class UserController {

    private static final Set<String> TECHNICAL_DEPARTMENTS = Set.of("IT", "MAINTENANCE", "SECURITY");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public UserController(UserRepository userRepository,
                          PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @GetMapping
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public List<User> getAllUsers() {
        return userRepository.findAll();
    }

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

    @GetMapping("/{id:[0-9]+}")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<User> getUserById(@PathVariable Long id) {
        return userRepository.findById(id)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.notFound().build());
    }

    /**
     * Authoritative Self-Profile Update.
     * All users (including System Administrators) may self-edit ONLY their phone number.
     * Full Name, Email, Username, Role, Status, and Department are strictly read-only.
     */
    @PutMapping("/{id:[0-9]+}/profile")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<User> updateOwnProfile(@PathVariable Long id,
                                                 @Valid @RequestBody ProfileUpdateRequest request,
                                                 Authentication authentication) {
        User currentUser = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        if (!currentUser.getId().equals(id)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "You can only update your own profile");
        }

        currentUser.setPhoneNumber(normalizeOptional(request.getPhoneNumber()));
        return ResponseEntity.ok(userRepository.save(currentUser));
    }

    /**
     * Administrative User Update.
     * System Administrators may update identity, role, account status, and technical department of other users.
     */
    @PutMapping("/{id:[0-9]+}")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<User> adminUpdateUser(@PathVariable Long id,
                                                @Valid @RequestBody AdminUserUpdateRequest request,
                                                Authentication authentication) {
        User targetUser = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        User currentAdmin = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        String newUsername = request.getUsername().trim();
        String newEmail = request.getEmail().trim().toLowerCase(Locale.ROOT);

        userRepository.findByUsername(newUsername)
                .filter(u -> !u.getId().equals(targetUser.getId()))
                .ifPresent(u -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Username is already taken");
                });

        userRepository.findByEmailIgnoreCase(newEmail)
                .filter(u -> !u.getId().equals(targetUser.getId()))
                .ifPresent(u -> {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is already registered");
                });

        Role newRole = request.getRole();
        String newStatus = request.getStatus().trim().toUpperCase(Locale.ROOT);
        if (!"ACTIVE".equals(newStatus) && !"SUSPENDED".equals(newStatus) && !"INACTIVE".equals(newStatus)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid status: " + newStatus);
        }

        // Prevent privileged administrative self-modification by the currently logged-in administrator
        if (targetUser.getId().equals(currentAdmin.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "System Administrators cannot use administrative management on their own account. Personal contact details may be updated in Profile.");
        }

        // Technical Department Authorization Invariant
        String department = normalizeOptional(request.getDepartment());
        if (newRole == Role.SUPPORT_AGENT || newRole == Role.TEAM_LEAD) {
            if (department == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Department is required for operational staff (SUPPORT_AGENT, TEAM_LEAD). Allowed values: IT, Maintenance, Security");
            }
            department = normalizeTechnicalDepartment(department);
        } else {
            // Non-operational roles do not have a technical authorization department
            department = null;
        }

        boolean securityChanged = !targetUser.getUsername().equalsIgnoreCase(newUsername)
                || targetUser.getRole() != newRole
                || !targetUser.getStatus().equalsIgnoreCase(newStatus);

        targetUser.setUsername(newUsername);
        targetUser.setEmail(newEmail);
        targetUser.setFullName(request.getFullName().trim());
        targetUser.setRole(newRole);
        targetUser.setStatus(newStatus);
        targetUser.setDepartment(department);
        targetUser.setPhoneNumber(normalizeOptional(request.getPhoneNumber()));

        if (securityChanged) {
            targetUser.setTokenVersion(targetUser.getTokenVersion() + 1);
        }

        User saved = userRepository.save(targetUser);
        return ResponseEntity.ok(saved);
    }

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

        Role role = request.getRole();
        String department = normalizeOptional(request.getDepartment());

        if (role == Role.SUPPORT_AGENT || role == Role.TEAM_LEAD) {
            if (department == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Department is required for operational staff (SUPPORT_AGENT, TEAM_LEAD). Allowed values: IT, Maintenance, Security");
            }
            department = normalizeTechnicalDepartment(department);
        } else {
            department = null;
        }

        User user = new User();
        user.setUsername(username);
        user.setPassword(passwordEncoder.encode(request.getPassword()));
        user.setEmail(email);
        user.setFullName(request.getFullName().trim());
        user.setRole(role);
        user.setDepartment(department);
        user.setPhoneNumber(normalizeOptional(request.getPhoneNumber()));
        user.setStatus("ACTIVE");

        User saved = userRepository.save(user);
        return ResponseEntity.status(HttpStatus.CREATED).body(saved);
    }

    @PutMapping("/{id:[0-9]+}/role")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> updateUserRole(@PathVariable Long id, @RequestBody Map<String, String> body, Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        User currentAdmin = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getId().equals(currentAdmin.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "System Administrators cannot modify their own role. Another administrator must perform this action.");
        }

        String roleStr = body.get("role");
        if (roleStr == null || roleStr.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "role is required");
        }

        try {
            Role newRole = Role.valueOf(roleStr.trim().toUpperCase(Locale.ROOT));
            if (newRole == Role.SUPPORT_AGENT || newRole == Role.TEAM_LEAD) {
                String dept = body.get("department");
                if (dept == null || dept.isBlank()) {
                    dept = user.getDepartment();
                }
                if (dept == null || dept.isBlank()) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                            "Department is required for operational staff (SUPPORT_AGENT, TEAM_LEAD). Allowed values: IT, Maintenance, Security");
                }
                user.setDepartment(normalizeTechnicalDepartment(dept));
            } else {
                user.setDepartment(null);
            }

            if (user.getRole() != newRole) {
                user.setTokenVersion(user.getTokenVersion() + 1);
            }
            user.setRole(newRole);

            User updated = userRepository.save(user);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid role: " + roleStr);
        }
    }

    @PutMapping("/{id:[0-9]+}/status")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<?> updateUserStatus(@PathVariable Long id, @RequestBody(required = false) Map<String, String> body, Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        User currentAdmin = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getId().equals(currentAdmin.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "System Administrators cannot suspend or deactivate their own account.");
        }

        String newStatus;
        if (body != null && body.containsKey("status") && !body.get("status").isBlank()) {
            newStatus = body.get("status").trim().toUpperCase(Locale.ROOT);
        } else {
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

    @DeleteMapping("/{id:[0-9]+}")
    @PreAuthorize("hasRole('SYSTEM_ADMINISTRATOR')")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id, Authentication authentication) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));

        User currentAdmin = userRepository.findByUsername(authentication.getName())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
        if (user.getId().equals(currentAdmin.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "System Administrators cannot delete their own account.");
        }

        userRepository.delete(user);
        return ResponseEntity.noContent().build();
    }

    private String normalizeTechnicalDepartment(String value) {
        if (value == null || value.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Department is required for operational staff (SUPPORT_AGENT, TEAM_LEAD). Allowed values: IT, Maintenance, Security");
        }
        String normalized = value.trim().toUpperCase(Locale.ROOT);
        if (!TECHNICAL_DEPARTMENTS.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Invalid technical department. Allowed values: IT, Maintenance, Security");
        }
        return switch (normalized) {
            case "IT" -> "IT";
            case "MAINTENANCE" -> "Maintenance";
            case "SECURITY" -> "Security";
            default -> throw new IllegalStateException("Unexpected department: " + normalized);
        };
    }

    private String normalizeOptional(String value) {
        if (value == null) return null;
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
