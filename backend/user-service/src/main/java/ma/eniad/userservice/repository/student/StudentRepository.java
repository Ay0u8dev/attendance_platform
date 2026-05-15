package ma.eniad.userservice.repository.student;

import ma.eniad.userservice.entity.Student;

import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import org.springframework.data.repository.query.Param;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    @Query("""
    SELECT s.numApogee
    FROM Student s
    WHERE s.numApogee IN :apogees
    """)
    Set<String> findExistingApogees(
        @Param("apogees") Set<String> apogees
    );
}
