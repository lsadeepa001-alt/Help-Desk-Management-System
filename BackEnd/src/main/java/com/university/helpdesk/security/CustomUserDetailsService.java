package com.university.helpdesk.security;

import com.university.helpdesk.model.User;
import com.university.helpdesk.repository.UserRepository;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;

@Service
public class CustomUserDetailsService implements UserDetailsService {

    private final UserRepository userRepository;

    public CustomUserDetailsService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    @Override
    public UserDetails loadUserByUsername(String usernameOrEmail) throws UsernameNotFoundException {
        String identifier = usernameOrEmail != null ? usernameOrEmail.trim() : "";
        User user = userRepository.findByUsername(identifier)
                .orElseGet(() -> userRepository.findByEmailIgnoreCase(identifier)
                        .orElseThrow(() -> new UsernameNotFoundException("User not found with username or email: " + usernameOrEmail)));

        return new CustomUserDetails(user);
    }
}
