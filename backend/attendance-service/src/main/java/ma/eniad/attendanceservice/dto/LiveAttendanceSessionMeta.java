package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;
import java.util.List;

import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;

public record LiveAttendanceSessionMeta(
        Long sessionId,

        Long teacherId,
        String teacherFullName,
        List<Long> groupIds,

        String courseLabel,
        String roomLabel,

        String gpsLat,
        String gpsLon,

        LocalDateTime startedAt,
        LocalDateTime endsAt,

        AttendanceSessionStatus status
) {
}
