package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record AttendanceUpdateResponse(
        Long sessionId,
        Long studentId,
        AttendanceStudentStatus status,
        AttendanceSessionMethod markMethod,
        LocalDateTime markedAt,
        int presentCount,
        int absentCount,
        int unknownCount
) {
}
