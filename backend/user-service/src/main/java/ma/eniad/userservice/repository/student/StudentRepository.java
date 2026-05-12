package ma.eniad.userservice.repository.student;

import ma.eniad.userservice.entity.Student;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    boolean existsByNumApogee(String numApogee);

    /** Used during update to exclude the current student from the uniqueness check. */
    boolean existsByNumApogeeAndIdNot(String numApogee, Long excludedId);
}
