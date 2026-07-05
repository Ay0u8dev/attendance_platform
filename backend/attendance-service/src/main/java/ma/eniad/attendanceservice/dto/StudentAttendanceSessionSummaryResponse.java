package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record StudentAttendanceSessionSummaryResponse(
        Long sessionId,
        String teacherFullName,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        AttendanceSessionStatus sessionStatus,
        LocalDateTime startedAt,
        LocalDateTime endedAt,
        AttendanceStudentStatus attendanceStatus,
        AttendanceSessionMethod markMethod,
        LocalDateTime markedAt
) {
}
