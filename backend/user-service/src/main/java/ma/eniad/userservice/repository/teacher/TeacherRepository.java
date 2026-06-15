package ma.eniad.userservice.repository.teacher;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import ma.eniad.userservice.entity.Teacher;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {
	Optional<Teacher> findByEmailIgnoreCase(String email);

	@Query("select t from Teacher t where lower(t.email) in :emails")
	List<Teacher> findByNormalizedEmailIn(@Param("emails") Set<String> emails);
}
