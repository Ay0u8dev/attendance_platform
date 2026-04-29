package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long> {
    boolean existsByTeacherIdAndStatus(Long teacherId, AttendanceSessionStatus status);

    Optional<AttendanceSession> findByTeacherIdAndStatus(Long teacherId, AttendanceSessionStatus status);

    Optional<AttendanceSession> findByIdAndTeacherId(Long id, Long teacherId);

    List<AttendanceSession> findAllByStatusAndEndsAtLessThanEqual(AttendanceSessionStatus status, LocalDateTime endsAt);
}
