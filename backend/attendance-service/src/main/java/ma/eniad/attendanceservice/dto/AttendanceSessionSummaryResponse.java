package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceSessionSummaryResponse(
        Long sessionId,
        String teacherFullName,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        AttendanceSessionStatus status,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime endedAt,
        int presentCount,
        int absentCount,
        int unknownCount
) {
}
