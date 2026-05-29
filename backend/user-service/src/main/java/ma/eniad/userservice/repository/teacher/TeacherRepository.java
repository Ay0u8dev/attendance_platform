package ma.eniad.userservice.repository.teacher;

import java.util.Optional;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import ma.eniad.userservice.entity.Teacher;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
	Optional<Teacher> findByEmailIgnoreCase(String email);
}
