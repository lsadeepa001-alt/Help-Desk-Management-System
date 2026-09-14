package com.university.helpdesk.repository;

import com.university.helpdesk.model.KbCategory;
import com.university.helpdesk.model.KnowledgeBaseArticle;
import com.university.helpdesk.model.User;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
public class KbDataInitializer implements CommandLineRunner {

    private final KnowledgeBaseArticleRepository articleRepository;
    private final UserRepository userRepository;

    public KbDataInitializer(KnowledgeBaseArticleRepository articleRepository, UserRepository userRepository) {
        this.articleRepository = articleRepository;
        this.userRepository = userRepository;
    }

    @Override
    public void run(String... args) {
        if (articleRepository.count() == 0) {
            User admin = userRepository.findAll().stream().findFirst().orElse(null);

            List<KnowledgeBaseArticle> seedArticles = Arrays.asList(
                new KnowledgeBaseArticle(
                    "Connecting to Campus Wi-Fi (UniWiFi-Secure)",
                    "To connect to UniWiFi-Secure:\n" +
                    "1. Select 'UniWiFi-Secure' from your device's Wi-Fi network list.\n" +
                    "2. Enter your student/staff ID as identity (e.g. IT22001234) and your University Portal password.\n" +
                    "3. Set EAP Method to 'PEAP' and Phase 2 Authentication to 'MSCHAPv2'.\n" +
                    "4. CA Certificate: Select 'Do not validate' or 'Use System Certificates'.\n" +
                    "If you experience authentication timeouts, forget the network and clear saved Wi-Fi credentials.",
                    KbCategory.IT_SERVICES,
                    "wifi, internet, wireless, network, uniwifi, peap",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Resetting Your Student Portal & LMS Password",
                    "If you have forgotten your password or are locked out:\n" +
                    "1. Visit https://portal.university.edu/forgot-password\n" +
                    "2. Enter your registered university email address.\n" +
                    "3. Open the verification code sent to your inbox and enter it within 15 minutes.\n" +
                    "4. Passwords must be at least 8 characters long and include an uppercase letter, number, and special symbol.\n" +
                    "Note: Account lockouts automatically clear after 30 minutes.",
                    KbCategory.IT_SERVICES,
                    "lms, portal, password, reset, login, credentials, lockout",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Requesting MATLAB & SPSS Academic License Keys",
                    "Students and faculty can activate MATLAB and SPSS for academic research:\n" +
                    "1. Go to the Software Portal at https://software.university.edu\n" +
                    "2. Sign in with your university account credentials.\n" +
                    "3. Select 'MATLAB R2024a' or 'IBM SPSS 29' and click 'Request Key'.\n" +
                    "4. Your individual license key will be generated and emailed within 5 minutes.\n" +
                    "Requires active enrollment for the current semester.",
                    KbCategory.ACADEMIC_AFFAIRS,
                    "matlab, spss, software, license, key, academic",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Computer Lab PC Login & Roaming Profile Sync",
                    "When logging into any campus lab PC:\n" +
                    "1. Use domain format: STUDENT\\your_id or LECTURER\\your_username.\n" +
                    "2. If you see 'No Logon Servers Available', ensure the ethernet cable is connected securely.\n" +
                    "3. Do not save heavy files (>1GB) on the Desktop; use your university OneDrive allocation (1TB) to prevent slow logon times.\n" +
                    "4. Always log off before leaving the lab station.",
                    KbCategory.IT_SERVICES,
                    "lab, pc, computer, login, profile, onedrive, domain",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Hostel Room Maintenance & Repair Requests",
                    "For physical issues in university hostels (plumbing, lighting, air conditioning, furniture):\n" +
                    "1. Check if the breaker switch has tripped in your corridor electrical box.\n" +
                    "2. For broken fixtures or water leaks, submit a ticket under category 'Maintenance' with building & room number.\n" +
                    "3. Emergency repairs (flooding, electrical sparks) are handled 24/7 by Hostel Caretaker Office (Ext: 4400).",
                    KbCategory.MAINTENANCE,
                    "hostel, repair, maintenance, light, fan, plumbing, water, room",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Library E-Journal Access & Off-Campus Proxy/VPN",
                    "To access IEEE Xplore, ScienceDirect, and JSTOR off-campus:\n" +
                    "1. Log into the Library EzProxy portal at https://libproxy.university.edu\n" +
                    "2. Or install the GlobalProtect VPN client configured to server vpn.university.edu.\n" +
                    "3. Sign in with your student credentials to gain instant subscription access.\n" +
                    "Contact library@university.edu for research database assistance.",
                    KbCategory.LIBRARY,
                    "library, vpn, ejournal, ieee, research, proxy, off-campus",
                    true,
                    admin
                ),
                new KnowledgeBaseArticle(
                    "Campus ID Card Replacement & Smart Access Badges",
                    "Lost or damaged student/staff ID cards:\n" +
                    "1. Report lost cards immediately to Security Central (Security Desk, Block A) to deactivate RFID access.\n" +
                    "2. Request a replacement online at Student Services portal ($10 replacement fee applies).\n" +
                    "3. Temporary 7-day visitor passes can be issued at the main entrance security booth upon presenting valid photo ID.",
                    KbCategory.SECURITY,
                    "id card, badge, security, lost card, access, pass",
                    true,
                    admin
                )
            );

            articleRepository.saveAll(seedArticles);
            System.out.println("✅ Initialized Knowledge Base seed articles successfully (" + seedArticles.size() + " articles)");
        }
    }
}
