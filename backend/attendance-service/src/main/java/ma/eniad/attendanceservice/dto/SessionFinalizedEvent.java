package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;

public record SessionFinalizedEvent(
        String eventType,
        Long sessionId,
        AttendanceSessionStatus status,
        int presentCount,
        int absentCount,
        int unknownCount
) {
}
