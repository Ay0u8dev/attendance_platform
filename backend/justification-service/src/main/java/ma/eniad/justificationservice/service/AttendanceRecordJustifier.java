package ma.eniad.justificationservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.entity.Justification;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.sql.Timestamp;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class AttendanceRecordJustifier {

    private final JdbcTemplate jdbcTemplate;

    public Long justifyAbsence(Justification justification) {
        Long resolvedSessionId = resolveAttendanceSessionId(justification);
        justifyAbsence(resolvedSessionId, justification.getStudentId());
        return resolvedSessionId;
    }

    private void justifyAbsence(Long sessionId, Long studentId) {
        List<String> statuses = jdbcTemplate.queryForList(
                """
                        select status
                        from attendance_records
                        where session_id = ? and student_id = ?
                        """,
                String.class,
                sessionId,
                studentId
        );

        if (statuses.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found");
        }

        // Regle metier: seule une absence peut etre convertie en absence justifiee.
        if (!"ABSENT".equals(statuses.getFirst())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only absent attendance records can be justified");
        }

        int updatedRows = jdbcTemplate.update(
                """
                        update attendance_records
                        set status = 'JUSTIFIED'
                        where session_id = ? and student_id = ? and status = 'ABSENT'
                        """,
                sessionId,
                studentId
        );

        if (updatedRows == 0) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance record could not be justified");
        }

        // Le compteur d'absences represente les absences non justifiees.
        jdbcTemplate.update(
                """
                        update attendance_sessions
                        set absent_count = case when absent_count > 0 then absent_count - 1 else 0 end
                        where id = ?
                        """,
                sessionId
        );
    }

    private Long resolveAttendanceSessionId(Justification justification) {
        if (justification.getSessionId() != null && attendanceRecordExists(justification.getSessionId(), justification.getStudentId())) {
            return justification.getSessionId();
        }

        return findClosestAbsentSession(justification)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found"));
    }

    private boolean attendanceRecordExists(Long sessionId, Long studentId) {
        Integer count = jdbcTemplate.queryForObject(
                """
                        select count(*)
                        from attendance_records
                        where session_id = ? and student_id = ?
                        """,
                Integer.class,
                sessionId,
                studentId
        );
        return count != null && count > 0;
    }

    private Optional<Long> findClosestAbsentSession(Justification justification) {
        List<AbsentCandidate> candidates = jdbcTemplate.query(
                """
                        select r.session_id, s.started_at, s.course_label
                        from attendance_records r
                        join attendance_sessions s on s.id = r.session_id
                        where r.student_id = ? and r.status = 'ABSENT'
                        """,
                (rs, rowNum) -> new AbsentCandidate(
                        rs.getLong("session_id"),
                        toLocalDateTime(rs.getTimestamp("started_at")),
                        rs.getString("course_label")
                ),
                justification.getStudentId()
        );

        String requestedModule = normalize(justification.getModule());
        LocalDateTime requestedDate = justification.getSessionDate();

        return candidates.stream()
                .sorted((left, right) -> Long.compare(score(left, requestedModule, requestedDate), score(right, requestedModule, requestedDate)))
                .map(AbsentCandidate::sessionId)
                .findFirst();
    }

    private long score(AbsentCandidate candidate, String requestedModule, LocalDateTime requestedDate) {
        long dateScore = requestedDate == null || candidate.startedAt() == null
                ? 1_000_000L
                : Math.abs(Duration.between(candidate.startedAt(), requestedDate).toMinutes());
        long modulePenalty = normalize(candidate.courseLabel()).equals(requestedModule) ? 0L : 100_000L;
        return modulePenalty + dateScore;
    }

    private LocalDateTime toLocalDateTime(Timestamp timestamp) {
        return timestamp == null ? null : timestamp.toLocalDateTime();
    }

    private String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase();
    }

    private record AbsentCandidate(Long sessionId, LocalDateTime startedAt, String courseLabel) {
    }
}
