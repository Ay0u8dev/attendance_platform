package ma.eniad.notificationservice.entity;

import jakarta.persistence.*;
import lombok.*;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "notifications",
        indexes = {
                @Index(name = "idx_notifications_recipient_created", columnList = "recipient_user_id, created_at"),
                @Index(name = "idx_notifications_recipient_read", columnList = "recipient_user_id, read_at"),
                @Index(name = "idx_notifications_type", columnList = "type"),
                @Index(name = "idx_notifications_related", columnList = "related_entity_type, related_entity_id")
        }
)
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Notification {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /**
     * Platform user id.
     * For students today, studentId == userId in your project context.
     */
    @Column(name = "recipient_user_id", nullable = false)
    private Long recipientUserId;

    @Enumerated(EnumType.STRING)
    @Column(name = "recipient_role", nullable = false, length = 30)
    private RecipientRole recipientRole;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 60)
    private NotificationType type;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private NotificationSeverity severity;

    @Column(nullable = false, length = 180)
    private String title;

    @Column(nullable = false, length = 1000)
    private String message;

    /**
     * Example: ATTENDANCE_SESSION, JUSTIFICATION, USER, etc.
     */
    @Column(name = "related_entity_type", length = 80)
    private String relatedEntityType;

    /**
     * Store as String to support Long ids now and UUID/string ids later.
     */
    @Column(name = "related_entity_id", length = 120)
    private String relatedEntityId;

    @Column(name = "metadata_json", columnDefinition = "TEXT")
    private String metadataJson;

    @Column(name = "read_at")
    private LocalDateTime readAt;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        if (severity == null) {
            severity = NotificationSeverity.INFO;
        }
        createdAt = now;
        updatedAt = now;
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
    }

    public boolean isRead() {
        return readAt != null;
    }

    public void markAsRead() {
        if (readAt == null) {
            readAt = LocalDateTime.now();
        }
    }

    public void markAsDeleted() {
        if (deletedAt == null) {
            deletedAt = LocalDateTime.now();
        }
    }
}
