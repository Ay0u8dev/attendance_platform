package ma.eniad.justificationservice.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JustificationResponse {
    private Long id;
    private Long attendanceRecordId;
    private Long sessionId;
    private Long studentId;
    private Long groupId;
    private Long teacherId;
    private String teacherName;
    private String studentName;
    private String studentEmail;
    private String studentCode;
    private String studentFormation;
    private String studentClass;
    private String studentGroup;
    private String courseLabel;
    private String roomLabel;
    private LocalDateTime absenceStartedAt;
    private LocalDateTime absenceEndedAt;
    private String reason;
    private String attachmentUrl;
    private JustificationStatus status;
    private String decisionComment;
    private String decidedBy;
    private String decidedByRole;
    private LocalDateTime decidedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String module;
    private LocalDateTime sessionDate;
    private LocalDateTime submittedAt;
    private String documentUrl;
    private String documentName;
    private String downloadUrl;
    private String teacherComment;
    private String reviewedBy;
    private String reviewerRole;
    private LocalDateTime reviewedAt;
}
