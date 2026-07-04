package ma.eniad.justificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;

import java.util.List;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Long> {
    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);

    List<Justification> findByStudentIdOrderBySubmittedAtDesc(Long studentId);

    List<Justification> findByStatusOrderBySubmittedAtAsc(JustificationStatus status);
}
