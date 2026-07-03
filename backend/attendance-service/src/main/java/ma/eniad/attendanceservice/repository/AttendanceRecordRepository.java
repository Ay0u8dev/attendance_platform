package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByStudentIdAsc(Long sessionId);

    List<AttendanceRecord> findBySessionIdInOrderByStudentIdAscSessionIdAsc(List<Long> sessionIds);

    void deleteBySessionId(Long sessionId);

    Optional<AttendanceRecord> findBySessionIdAndStudentId(Long sessionId, Long studentId);

    @Query("""
            select r from AttendanceRecord r
            join r.session s
            where r.studentId = :studentId
              and (:filterStatus = false or r.status = :status)
              and (:filterStartedFrom = false or s.startedAt >= :startedFrom)
              and (:filterStartedToExclusive = false or s.startedAt < :startedToExclusive)
            order by s.startedAt desc, r.id asc
            """)
    Page<AttendanceRecord> findStudentHistory(@Param("studentId") Long studentId,
                                              @Param("filterStatus") boolean filterStatus,
                                              @Param("status") AttendanceStudentStatus status,
                                              @Param("filterStartedFrom") boolean filterStartedFrom,
                                              @Param("startedFrom") LocalDateTime startedFrom,
                                              @Param("filterStartedToExclusive") boolean filterStartedToExclusive,
                                              @Param("startedToExclusive") LocalDateTime startedToExclusive,
                                              Pageable pageable);
}
