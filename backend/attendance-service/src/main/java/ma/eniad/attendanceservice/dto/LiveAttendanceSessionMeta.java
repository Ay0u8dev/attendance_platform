package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;

import java.time.LocalDateTime;
import java.util.List;

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

        AttendanceSessionMethod method,
        AttendanceSessionStatus status
) {
}
