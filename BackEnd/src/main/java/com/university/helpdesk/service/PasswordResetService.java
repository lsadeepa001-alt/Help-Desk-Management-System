package com.university.helpdesk.service;

import com.university.helpdesk.model.PasswordResetToken;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.PasswordResetTokenRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.security.SecureRandom;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.HexFormat;
import java.util.List;

@Service
public class PasswordResetService {

    private final UserRepository userRepository;
    private final PasswordResetTokenRepository tokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final SecureRandom secureRandom = new SecureRandom();

    @Value("${app.password-reset-token-expiration-minutes:15}")
    private long expirationMinutes;

    public PasswordResetService(UserRepository userRepository,
                                PasswordResetTokenRepository tokenRepository,
                                PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.tokenRepository = tokenRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Transactional
    public void requestReset(String email) {
        userRepository.findByEmailIgnoreCase(email.trim())
                .filter(user -> "ACTIVE".equalsIgnoreCase(user.getStatus()))
                .ifPresent(user -> {
            LocalDateTime now = LocalDateTime.now();
            tokenRepository.findByUserAndUsedAtIsNull(user).forEach(token -> token.setUsedAt(now));

            PasswordResetToken token = new PasswordResetToken();
            token.setUser(user);
            tokenRepository.save(token);
        });
    }

    @Transactional(readOnly = true)
    public List<PendingResetRequest> getPendingRequests() {
        LocalDateTime now = LocalDateTime.now();
        return tokenRepository.findByUsedAtIsNullOrderByCreatedAtAsc().stream()
                .filter(token -> "ACTIVE".equalsIgnoreCase(token.getUser().getStatus()))
                .map(token -> new PendingResetRequest(
                        token.getId(),
                        token.getUser().getId(),
                        token.getUser().getUsername(),
                        token.getUser().getEmail(),
                        token.getCreatedAt(),
                        token.getIssuedAt(),
                        token.getExpiresAt(),
                        token.getExpiresAt() != null && !token.getExpiresAt().isAfter(now)
                ))
                .toList();
    }

    @Transactional
    public IssuedResetCredential issueCredential(Long requestId) {
        PasswordResetToken request = tokenRepository.findById(requestId)
                .filter(token -> token.getUsedAt() == null)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND,
                        "Pending password reset request not found"));

        if (!"ACTIVE".equalsIgnoreCase(request.getUser().getStatus())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Password reset credentials can only be issued for active accounts");
        }

        LocalDateTime now = LocalDateTime.now();
        byte[] randomBytes = new byte[32];
        secureRandom.nextBytes(randomBytes);
        String rawToken = Base64.getUrlEncoder().withoutPadding().encodeToString(randomBytes);
        LocalDateTime expiresAt = now.plusMinutes(expirationMinutes);

        request.setTokenHash(hashToken(rawToken));
        request.setIssuedAt(now);
        request.setExpiresAt(expiresAt);
        tokenRepository.save(request);

        return new IssuedResetCredential(
                request.getId(),
                request.getUser().getUsername(),
                rawToken,
                expiresAt
        );
    }

    @Transactional
    public void resetPassword(String rawToken, String newPassword) {
        PasswordResetToken token = tokenRepository.findActiveByTokenHashForUpdate(hashToken(rawToken.trim()))
                .orElseThrow(() -> invalidToken());

        LocalDateTime now = LocalDateTime.now();
        if (token.getExpiresAt() == null || token.getExpiresAt().isBefore(now)) {
            throw invalidToken();
        }

        User user = token.getUser();
        user.setPassword(passwordEncoder.encode(newPassword));
        user.setTokenVersion(user.getTokenVersion() + 1);
        tokenRepository.findByUserAndUsedAtIsNull(user).forEach(activeToken -> activeToken.setUsedAt(now));
        userRepository.save(user);
    }

    private ResponseStatusException invalidToken() {
        return new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid or expired password reset token");
    }

    private String hashToken(String rawToken) {
        try {
            byte[] digest = MessageDigest.getInstance("SHA-256")
                    .digest(rawToken.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(digest);
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 is not available", e);
        }
    }

    public record PendingResetRequest(Long requestId,
                                      Long userId,
                                      String username,
                                      String email,
                                      LocalDateTime requestedAt,
                                      LocalDateTime issuedAt,
                                      LocalDateTime expiresAt,
                                      boolean expired) {}

    public record IssuedResetCredential(Long requestId,
                                        String username,
                                        String resetToken,
                                        LocalDateTime expiresAt) {}
}
