package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record AttendanceUpdateResponse(
        Long sessionId,
        Long studentId,
        AttendanceStudentStatus status,
        AttendanceSessionMethod markMethod,
        String deviceId,
        LocalDateTime markedAt,
        int presentCount,
        int absentCount,
        int unknownCount
) {
}
