package ma.eniad.userservice.repository;

import ma.eniad.userservice.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

import java.util.Optional;
import java.util.Set;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByEmail(String email);

    boolean existsByEmail(String email);

    /**
     * Finds existing emails from the provided set.
     * Note: For optimal performance, limit input to ~1000 emails per call.
     * @param emails Set of emails to check (should not be null or exceed 1000 elements)
     * @return Set of emails that exist in the database
     */
    @Query("""
    SELECT u.email
    FROM User u
    WHERE u.email IN :emails
    """)
    Set<String> findExistingEmails(
        @Param("emails") Set<String> emails
    );
}