package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceSessionRepository extends JpaRepository<AttendanceSession, Long>, JpaSpecificationExecutor<AttendanceSession> {
    boolean existsByTeacherIdAndStatus(Long teacherId, AttendanceSessionStatus status);

    Optional<AttendanceSession> findByTeacherIdAndStatus(Long teacherId, AttendanceSessionStatus status);

    Optional<AttendanceSession> findByIdAndTeacherId(Long id, Long teacherId);

    List<AttendanceSession> findAllByStatus(AttendanceSessionStatus status);

    List<AttendanceSession> findAllByStatusAndEndsAtLessThanEqual(AttendanceSessionStatus status, LocalDateTime endsAt);
}
