package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByStudentIdAsc(Long sessionId);

    void deleteBySessionId(Long sessionId);

    Optional<AttendanceRecord> findBySessionIdAndStudentId(Long sessionId, Long studentId);

    @Query("""
            select r from AttendanceRecord r
            join AttendanceSession s on s.id = r.sessionId
            where r.studentId = :studentId
              and (:status is null or r.status = :status)
              and (:startedFrom is null or s.startedAt >= :startedFrom)
              and (:startedToExclusive is null or s.startedAt < :startedToExclusive)
            """)
    Page<AttendanceRecord> findStudentHistory(@Param("studentId") Long studentId,
                                              @Param("status") AttendanceStudentStatus status,
                                              @Param("startedFrom") LocalDateTime startedFrom,
                                              @Param("startedToExclusive") LocalDateTime startedToExclusive,
                                              Pageable pageable);
}
