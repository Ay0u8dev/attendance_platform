package ma.eniad.notificationservice.dto;

import java.time.LocalDateTime;

import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;

public record NotificationResponse(
    Long id,
    Long recipientUserId,
    RecipientRole recipientRole,
    NotificationType type,
    NotificationSeverity severity,
    String title,
    String message,
    String relatedEntityType,
    String relatedEntityId,
    String metadataJson,
    LocalDateTime readAt,
    LocalDateTime createdAt,
    boolean read
) {
    
}
