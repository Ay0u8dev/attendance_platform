package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record LiveAttendanceStudentState(
        Long studentId,
        Long groupId,

        String firstName,
        String lastName,
        String email,
        String pfpUrl,

        String numApogee,
        String filiere,
        String groupeName,

        AttendanceStudentStatus status,

        LocalDateTime markedAt,

        AttendanceSessionMethod markMethod,

        String deviceId,
        String markedGpsLat,
        String markedGpsLon
) {
}
