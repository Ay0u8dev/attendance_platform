package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.time.LocalDateTime;
import java.util.List;

public record StudentActiveAttendanceSessionResponse(
        Long sessionId,
        String teacherFullName,
        String courseLabel,
        String roomLabel,
        List<Long> groupIds,
        AttendanceSessionMethod sessionMethod,
        LocalDateTime startedAt,
        LocalDateTime endsAt,
        AttendanceStudentStatus attendanceStatus
) {
}
