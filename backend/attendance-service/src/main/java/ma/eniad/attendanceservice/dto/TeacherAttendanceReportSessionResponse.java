package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;

public record TeacherAttendanceReportSessionResponse(
        Long sessionId,
        String courseLabel,
        String roomLabel,
        LocalDateTime startedAt,
        LocalDateTime endedAt
) {
}
