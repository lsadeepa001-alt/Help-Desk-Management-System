package com.university.helpdesk.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

/**
 * Centralized email delivery service.
 *
 * Controlled by environment variable EMAIL_ENABLED (default: false).
 * Email failure NEVER rolls back a ticket lifecycle action.
 * No credentials are hard-coded; all SMTP settings come from environment variables:
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

    @Value("${app.email.from:noreply@uniassist360.local}")
    private String fromAddress;

    // Optional: may not be configured if SMTP host not set
    private final JavaMailSender mailSender;

    public EmailService(@Autowired(required = false) JavaMailSender mailSender) {
        this.mailSender = mailSender;
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
            message.setFrom(fromAddress);
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
