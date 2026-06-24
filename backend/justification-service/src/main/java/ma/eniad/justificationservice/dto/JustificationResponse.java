package ma.eniad.justificationservice.dto;

import ma.eniad.justificationservice.entity.JustificationStatus;

import java.time.LocalDateTime;

public record JustificationResponse(
        Long id,
        Long attendanceRecordId,
        Long sessionId,
        Long studentId,
        Long groupId,
        Long teacherId,
        String teacherName,
        String studentName,
        String studentEmail,
        String studentCode,
        String courseLabel,
        String roomLabel,
        LocalDateTime absenceStartedAt,
        LocalDateTime absenceEndedAt,
        String reason,
        String attachmentUrl,
        JustificationStatus status,
        String decisionComment,
        String decidedBy,
        String decidedByRole,
        LocalDateTime decidedAt,
        LocalDateTime createdAt,
        LocalDateTime updatedAt
) {
}
