package com.university.helpdesk.config;

import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.model.Category;
import com.university.helpdesk.repository.CategoryRepository;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

import java.util.List;

/** Creates only the required bootstrap administrator and ticket category master data. */
@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private static final String STRONG_PASSWORD_PATTERN =
            "^(?=.*[a-z])(?=.*[A-Z])(?=.*\\d)(?=.*[@$!%*?&#^()_\\-]).{8,}$";

    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.bootstrap-admin.username:admin}")
    private String bootstrapUsername;

    @Value("${app.bootstrap-admin.email:admin@localhost}")
    private String bootstrapEmail;

    @Value("${app.bootstrap-admin.password}")
    private String bootstrapPassword;

    public DataSeeder(UserRepository userRepository,
                      CategoryRepository categoryRepository,
                      PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.categoryRepository = categoryRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        seedTicketCategories();
        seedBootstrapAdministrator();
    }

    private void seedBootstrapAdministrator() {
        if (userRepository.existsByRole(Role.SYSTEM_ADMINISTRATOR)) {
            return;
        }

        String username = bootstrapUsername.trim();
        String email = bootstrapEmail.trim();
        if (username.isEmpty() || email.isEmpty() || bootstrapPassword.isBlank()) {
            throw new IllegalStateException("Bootstrap administrator username, email, and password must be configured");
        }
        if (!bootstrapPassword.matches(STRONG_PASSWORD_PATTERN)) {
            throw new IllegalStateException("Bootstrap administrator password does not meet the password policy");
        }
        if (userRepository.findByUsername(username).isPresent() || userRepository.findByEmailIgnoreCase(email).isPresent()) {
            throw new IllegalStateException("Bootstrap administrator username or email is already used by a non-administrator account");
        }

        User admin = new User();
        admin.setUsername(username);
        admin.setPassword(passwordEncoder.encode(bootstrapPassword));
        admin.setEmail(email);
        admin.setFullName("System Administrator");
        admin.setRole(Role.SYSTEM_ADMINISTRATOR);
        admin.setStatus("ACTIVE");
        userRepository.save(admin);
    }

    private void seedTicketCategories() {
        List<Category> categories = List.of(
                new Category(null, "Network & Wi-Fi", "Issues related to campus Wi-Fi, Ethernet connection, VPN access"),
                new Category(null, "LMS & Student Portal", "LMS, registration, and grade portal issues"),
                new Category(null, "Hardware & Lab Equipment", "Desktop PCs, projectors, lab printers, and monitors"),
                new Category(null, "Software & Licensing", "Software installation and academic licensing requests"),
                new Category(null, "Account & Security", "Password resets, multi-factor authentication, and account access")
        );
        categories.stream()
                .filter(category -> categoryRepository.findByName(category.getName()).isEmpty())
                .forEach(categoryRepository::save);
    }
}
