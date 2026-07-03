package ma.eniad.justificationservice.controller.dto;

import java.time.LocalDateTime;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import ma.eniad.justificationservice.entity.JustificationStatus;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class JustificationResponse {
    private Long id;
    private Long sessionId;
    private Long studentId;
    private String studentName;
    private String studentCode;
    private String studentFormation;
    private String studentClass;
    private String studentGroup;
    private String module;
    private LocalDateTime sessionDate;
    private JustificationStatus status;
    private String reason;
    private LocalDateTime submittedAt;
    private String documentUrl;
    private String documentName;
    private String downloadUrl;
    private String teacherComment;
    private String reviewedBy;
    private String reviewerRole;
    private LocalDateTime reviewedAt;
}
