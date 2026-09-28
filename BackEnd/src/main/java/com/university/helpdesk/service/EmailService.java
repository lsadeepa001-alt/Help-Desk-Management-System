package com.university.helpdesk.service;

import jakarta.annotation.PostConstruct;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

/**
 * Centralized email delivery service.
 *
 * Controlled by environment variable EMAIL_ENABLED (default: false).
 * Email failure NEVER rolls back a ticket lifecycle action.
 * No credentials are hard-coded; all SMTP settings come from environment variables or .env:
 *   SMTP_HOST, SMTP_PORT, SMTP_USERNAME, SMTP_PASSWORD, SMTP_FROM, EMAIL_ENABLED
 *
 * If spring.mail.host is not configured, JavaMailSender will not be auto-configured
 * and this service safely degrades by logging only.
 */
@Service
public class EmailService {

    private static final Logger log = LoggerFactory.getLogger(EmailService.class);

    @Value("${app.email.enabled:false}")
    private boolean emailEnabled;

    @Value("${app.email.from:${SMTP_FROM:${SMTP_USERNAME:noreply@uniassist360.local}}}")
    private String fromAddress;

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.port:587}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    // Optional: may not be configured if SMTP host not set
    private final JavaMailSender mailSender;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    @PostConstruct
    public void logDiagnostics() {
        if (!emailEnabled) {
            log.info("Email delivery: DISABLED");
            return;
        }

        List<String> missing = new ArrayList<>();
        if (host == null || host.isBlank()) {
            missing.add("SMTP_HOST");
        }
        if (username == null || username.isBlank()) {
            missing.add("SMTP_USERNAME");
        }
        if (password == null || password.isBlank()) {
            missing.add("SMTP_PASSWORD");
        }

        if (!missing.isEmpty()) {
            log.warn("Email delivery enabled but required SMTP configuration is incomplete:");
            for (String item : missing) {
                log.warn("missing {}", item);
            }
        } else {
            log.info("Email delivery: ENABLED");
            log.info("SMTP host: configured");
            log.info("SMTP port: {}", port);
            log.info("SMTP username: configured");
            log.info("SMTP from address: configured");
        }
    }

    /**
     * Determines the effective sender email address.
     * Prefers explicitly configured fromAddress (SMTP_FROM or SMTP_USERNAME),
     * falling back to noreply@uniassist360.local if empty or unconfigured.
     */
    public String getEffectiveFromAddress() {
        if (fromAddress != null && !fromAddress.isBlank() && !fromAddress.equals("noreply@uniassist360.local")) {
            return fromAddress.trim();
        }
        if (username != null && !username.isBlank()) {
            return username.trim();
        }
        if (fromAddress != null && !fromAddress.isBlank()) {
            return fromAddress.trim();
        }
        return "noreply@uniassist360.local";
    }

    /**
     * Send a plain-text email. Returns true if sent successfully, false otherwise.
     * Silently catches and logs any exception so that email failures never affect
     * the calling business transaction.
     */
    public boolean sendEmail(String to, String subject, String body) {
        if (!emailEnabled) {
            log.info("Email delivery disabled (app.email.enabled=false). Skipping email to={}", to);
            return false;
        }
        if (mailSender == null) {
            log.warn("Email enabled but JavaMailSender is not configured. Set spring.mail.host. Skipping email to={}", to);
            return false;
        }
        if (to == null || to.isBlank()) {
            log.warn("sendEmail called with blank recipient — skipping");
            return false;
        }
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setFrom(getEffectiveFromAddress());
            message.setTo(to);
            message.setSubject(subject);
            message.setText(body);
            mailSender.send(message);
            log.info("Email sent to={} subject={}", to, subject);
            return true;
        } catch (Exception e) {
            // Safe diagnostic logging — never logs passwords or secrets
            log.error("Email delivery failed for to={} subject={}: {}", to, subject, e.getMessage());
            return false;
        }
    }
}
