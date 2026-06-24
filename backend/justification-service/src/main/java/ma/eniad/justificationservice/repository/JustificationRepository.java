package ma.eniad.justificationservice.repository;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;

import jakarta.persistence.LockModeType;
import java.util.List;
import java.util.Optional;

@Repository
public interface JustificationRepository extends JpaRepository<Justification, Long> {
    boolean existsBySessionIdAndStudentId(Long sessionId, Long studentId);

    List<Justification> findByStudentIdOrderBySubmittedAtDesc(Long studentId);

    List<Justification> findByTeacherIdOrderBySubmittedAtDesc(Long teacherId);

    List<Justification> findByTeacherIdIsNullAndSessionIdIsNotNull();

    List<Justification> findByStatusOrderBySubmittedAtDesc(JustificationStatus status);

    List<Justification> findAllByOrderBySubmittedAtDesc();

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select j from Justification j where j.id = :id")
    Optional<Justification> findByIdForDecision(Long id);
}
