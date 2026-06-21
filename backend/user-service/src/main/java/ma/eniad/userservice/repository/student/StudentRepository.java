package ma.eniad.userservice.repository.student;

import ma.eniad.userservice.entity.Student;

import java.util.List;
import java.util.Set;
import java.util.Optional;
import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByNumApogee(String numApogee);

    boolean existsByNumApogeeAndIdNot(String numApogee, Long excludedId);

    /**
     * Finds students by a set of emails, performing a case‑insensitive match.
     * <p>
     * <strong>Important:</strong> The input {@code emails} set must already contain
     * lowercased strings, because JPQL does not allow applying {@code LOWER()}
     * to a collection parameter inside an {@code IN} clause.
     * </p>
     * <p>
     * Example usage:
     * <pre>
     * Set<String> lowercasedEmails = emails.stream()
     *     .map(String::toLowerCase)
     *     .collect(Collectors.toSet());
     * repository.findByEmailIn(lowercasedEmails);
     * </pre>
     * </p>
     *
     * @param emails a set of lowercased email addresses
     * @return list of students whose email (case‑insensitively) matches any email in the set
     */
    @Query("SELECT s FROM Student s WHERE lower(s.email) IN :emails")
    List<Student> findByEmailIn(@Param("emails") Set<String> emails);

    Optional<Student> findByNumApogee(String numApogee);

    List<Student> findByNumApogeeIn(Set<String> numApogees);

    Optional<Student> findByEmailIgnoreCase(String email);

    @Query("SELECT s.numApogee FROM Student s WHERE s.numApogee IN :apogees")
    Set<String> findExistingApogees(
        @Param("apogees") Set<String> apogees
    );

    @Query("""
            SELECT DISTINCT s FROM Student s
            JOIN s.inscriptions i
            WHERE i.groupe.id = :groupeId
            ORDER BY s.lastName, s.firstName, s.numApogee
            """)
    List<Student> findByGroupeId(@Param("groupeId") Long groupeId);
}
