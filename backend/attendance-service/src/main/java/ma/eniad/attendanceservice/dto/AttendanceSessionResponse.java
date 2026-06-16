package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceSessionResponse(
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

        AttendanceSessionStatus status,

        int studentCount
) {
}
