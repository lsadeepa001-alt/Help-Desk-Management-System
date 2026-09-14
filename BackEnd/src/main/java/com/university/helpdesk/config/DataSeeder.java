package com.university.helpdesk.config;

import com.university.helpdesk.model.Role;
import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Seeds default user accounts on first startup if the users table is empty.
 * This ensures every team member can log in immediately after cloning & running the project.
 *
 * Default Credentials:
 *   Admin:         admin   / admin123
 *   Support Agent: agent   / agent123
 *   Student:       student / student123
 */
@Component
@Order(1)
public class DataSeeder implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    public DataSeeder(UserRepository userRepository, PasswordEncoder passwordEncoder) {
        this.userRepository = userRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        if (userRepository.count() > 0) {
            System.out.println("ℹ️  Users table is not empty — skipping default account seeding.");
            return;
        }

        System.out.println("🌱 Seeding default user accounts...");

        // 1. Admin account
        User admin = new User();
        admin.setUsername("admin");
        admin.setPassword(passwordEncoder.encode("Admin@123"));
        admin.setEmail("admin@sliit.lk");
        admin.setFullName("System Administrator");
        admin.setRole(Role.ADMIN);
        admin.setDepartment("IT Administration");
        admin.setPhoneNumber("0770000001");
        admin.setStatus("ACTIVE");
        userRepository.save(admin);

        // 2. Support Agent account
        User agent = new User();
        agent.setUsername("agent");
        agent.setPassword(passwordEncoder.encode("Agent@123"));
        agent.setEmail("agent@sliit.lk");
        agent.setFullName("IT Support Agent");
        agent.setRole(Role.SUPPORT_AGENT);
        agent.setDepartment("IT Services");
        agent.setPhoneNumber("0770000002");
        agent.setStatus("ACTIVE");
        userRepository.save(agent);

        // 3. Student account
        User student = new User();
        student.setUsername("student");
        student.setPassword(passwordEncoder.encode("Student@123"));
        student.setEmail("student@sliit.lk");
        student.setFullName("Kasun Perera");
        student.setRole(Role.STUDENT);
        student.setDepartment("Computing");
        student.setPhoneNumber("0770000003");
        student.setStatus("ACTIVE");
        userRepository.save(student);

        // 4. Lecturer account
        User lecturer = new User();
        lecturer.setUsername("lecturer");
        lecturer.setPassword(passwordEncoder.encode("Lecturer@123"));
        lecturer.setEmail("lecturer@sliit.lk");
        lecturer.setFullName("Dr. Nimal Silva");
        lecturer.setRole(Role.LECTURER);
        lecturer.setDepartment("Engineering");
        lecturer.setPhoneNumber("0770000004");
        lecturer.setStatus("ACTIVE");
        userRepository.save(lecturer);

        // 5. Department Manager account
        User manager = new User();
        manager.setUsername("manager");
        manager.setPassword(passwordEncoder.encode("Manager@123"));
        manager.setEmail("manager@sliit.lk");
        manager.setFullName("David Davis (Dept Manager)");
        manager.setRole(Role.DEPARTMENT_MANAGER);
        manager.setDepartment("IT Services");
        manager.setPhoneNumber("0770000005");
        manager.setStatus("ACTIVE");
        userRepository.save(manager);

        System.out.println("✅ Default accounts seeded successfully (admin, agent, student, lecturer, manager).");
    }
}
