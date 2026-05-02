package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record StudentAttendanceSessionDetailResponse(
        Long sessionId,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        AttendanceSessionMethod sessionMethod,
        AttendanceSessionStatus sessionStatus,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        LocalDateTime endedAt,
        Long studentId,
        Long groupId,
        String firstName,
        String lastName,
        String email,
        String pfpUrl,
        String numApogee,
        AttendanceStudentStatus attendanceStatus,
        AttendanceSessionMethod markMethod,
        String deviceId,
        String markedGpsLat,
        String markedGpsLon,
        LocalDateTime markedAt
) {
}
