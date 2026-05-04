package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record StudentAttendanceSessionSummaryResponse(
        Long sessionId,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        AttendanceSessionMethod sessionMethod,
        AttendanceSessionStatus sessionStatus,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        AttendanceStudentStatus attendanceStatus,
        AttendanceSessionMethod markMethod,
        LocalDateTime markedAt
) {
}
