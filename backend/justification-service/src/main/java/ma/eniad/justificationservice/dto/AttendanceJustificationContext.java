package ma.eniad.justificationservice.dto;

import java.time.LocalDateTime;

public record AttendanceJustificationContext(
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
        String attendanceStatus
) {
}
