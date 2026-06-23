package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceJustification;
import ma.eniad.attendanceservice.entity.JustificationStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface AttendanceJustificationRepository extends JpaRepository<AttendanceJustification, Long> {
    List<AttendanceJustification> findAllByOrderByCreatedAtDescIdDesc();

    List<AttendanceJustification> findByStatusOrderByCreatedAtDescIdDesc(JustificationStatus status);

    Optional<AttendanceJustification> findBySessionIdAndStudentId(Long sessionId, Long studentId);
}
