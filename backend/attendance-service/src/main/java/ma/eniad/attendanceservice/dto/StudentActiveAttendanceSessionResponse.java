package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;
import java.util.List;

import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

public record StudentActiveAttendanceSessionResponse(
        Long sessionId,
        String teacherFullName,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        AttendanceStudentStatus attendanceStatus
) {
}
