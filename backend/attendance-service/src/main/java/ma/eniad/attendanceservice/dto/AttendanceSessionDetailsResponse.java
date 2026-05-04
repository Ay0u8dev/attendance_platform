package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;

import java.time.LocalDateTime;
import java.util.List;

public record AttendanceSessionDetailsResponse(
        Long sessionId,
        Long teacherId,
        List<Long> groupIds,
        String courseLabel,
        String roomLabel,
        String gpsLat,
        String gpsLon,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime endedAt,
        AttendanceSessionMethod method,
        AttendanceSessionStatus status,
        int presentCount,
        int absentCount,
        int unknownCount,
        List<AttendanceStudentView> students
) {
}
