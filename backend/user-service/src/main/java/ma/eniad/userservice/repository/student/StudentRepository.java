package ma.eniad.userservice.repository.student;

import ma.eniad.userservice.entity.Student;

import java.util.List;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByNumApogee(String numApogee);

    boolean existsByNumApogeeAndIdNot(String numApogee, Long excludedId);

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
