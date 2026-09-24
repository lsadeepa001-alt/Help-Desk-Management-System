package com.university.helpdesk.repository;

import com.university.helpdesk.model.PasswordResetToken;
import com.university.helpdesk.model.User;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT token FROM PasswordResetToken token WHERE token.tokenHash = :tokenHash AND token.usedAt IS NULL")
    Optional<PasswordResetToken> findActiveByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    List<PasswordResetToken> findByUserAndUsedAtIsNull(User user);
    List<PasswordResetToken> findByUsedAtIsNullOrderByCreatedAtAsc();
}
