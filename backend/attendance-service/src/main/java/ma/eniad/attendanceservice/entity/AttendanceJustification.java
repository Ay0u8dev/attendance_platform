package ma.eniad.attendanceservice.entity;

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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "attendance_justifications")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AttendanceJustification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long sessionId;

    @Column(nullable = false)
    private Long studentId;

    @Column(nullable = false)
    private Long groupId;

    @Column(nullable = false)
    private String studentFirstName;

    @Column(nullable = false)
    private String studentLastName;

    @Column(nullable = false)
    private String studentEmail;

    @Column(nullable = false)
    private String numApogee;

    @Column(nullable = false)
    private String courseLabel;

    @Column(nullable = false)
    private String roomLabel;

    @Column(nullable = false)
    private String teacherFullName;

    @Column(nullable = false)
    private LocalDateTime absenceStartedAt;

    private LocalDateTime absenceEndedAt;

    @Column(nullable = false, length = 1000)
    private String motive;

    @Column(length = 255)
    private String attachmentLabel;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private JustificationStatus status;

    @Column(length = 1000)
    private String adminComment;

    private Long reviewedBy;

    private LocalDateTime reviewedAt;

    @Column(nullable = false)
    private LocalDateTime createdAt;

    @Column(nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void beforeCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void beforeUpdate() {
        updatedAt = LocalDateTime.now();
    }
}
