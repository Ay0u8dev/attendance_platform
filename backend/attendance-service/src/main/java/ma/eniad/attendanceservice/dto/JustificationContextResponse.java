package ma.eniad.attendanceservice.dto;


import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record JustificationContextResponse(
        Long attendanceRecordId,
        Long sessionId,
        Long studentId,
        Long groupId,
        Long teacherId,
        String teacherFullName,
        String studentName,
        String studentEmail,
        String studentCode,
        String courseLabel,
        String roomLabel,
        LocalDateTime sessionStartedAt,
        LocalDateTime sessionEndedAt,
        AttendanceStudentStatus attendanceStatus
) {
}
