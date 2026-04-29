package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record AttendanceStudentView(
        Long studentId,
        Long groupId,
        String firstName,
        String lastName,
        String email,
        String numApogee,
        AttendanceStudentStatus status,
        AttendanceSessionMethod markMethod,
        String deviceId,
        String markedGpsLat,
        String markedGpsLon,
        LocalDateTime markedAt
) {
}
