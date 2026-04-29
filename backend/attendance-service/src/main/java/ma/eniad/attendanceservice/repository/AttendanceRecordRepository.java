package ma.eniad.attendanceservice.repository;

import ma.eniad.attendanceservice.entity.AttendanceRecord;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AttendanceRecordRepository extends JpaRepository<AttendanceRecord, Long> {
    List<AttendanceRecord> findBySessionIdOrderByStudentIdAsc(Long sessionId);

    void deleteBySessionId(Long sessionId);
}
