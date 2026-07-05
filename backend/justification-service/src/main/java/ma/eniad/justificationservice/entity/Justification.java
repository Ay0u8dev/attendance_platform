package ma.eniad.justificationservice.entity;

import java.time.LocalDateTime;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;

@Entity
@Table(
        name = "justifications",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_justification_session_student",
                columnNames = {"session_id", "student_id"}
        )
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Justification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column
    private Long sessionId;

    @Column
    private Long attendanceRecordId;

    @Column(nullable = false)
    private Long studentId;

    @Column
    private Long groupId;

    @Column
    private Long teacherId;

    @Column(length = 255)
    private String teacherName;

    @Column(nullable = false)
    private String studentName;

    @Column(length = 254)
    private String studentEmail;

    @Column(length = 64)
    private String studentCode;

    @Column(length = 128)
    private String studentFormation;

    @Column(length = 128)
    private String studentClass;

    @Column(length = 128)
    private String studentGroup;

    @Column(nullable = false)
    private String module;

    @Column(length = 255)
    private String roomLabel;

    @Column(nullable = false)
    private LocalDateTime sessionDate;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private JustificationStatus status;

    @Column(length = 1024)
    private String reason;

    @Column(nullable = false)
    private LocalDateTime submittedAt;

    @Column(length = 512)
    private String documentUrl;

    @Column(length = 512)
    private String teacherComment;

    @Column(length = 128)
    private String reviewedBy;

    @Column(length = 32)
    private String reviewerRole;

    private LocalDateTime reviewedAt;

    private LocalDateTime sessionEndedAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void beforeCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (submittedAt == null) {
            submittedAt = now;
        }
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
