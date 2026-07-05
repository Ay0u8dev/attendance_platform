package ma.eniad.notificationservice.dto;

import ma.eniad.notificationservice.entity.enums.NotificationChannel;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;

import java.time.LocalDateTime;
import java.util.Set;

public record NotificationRequestedEvent(
        String eventId,
        String eventSource,
        NotificationType type,
        Long recipientUserId,
        RecipientRole recipientRole,
        String recipientEmail,
        String recipientName,
        String title,
        String message,
        NotificationSeverity severity,
        String relatedEntityType,
        String relatedEntityId,
        Set<NotificationChannel> channels,
        String metadataJson,
        LocalDateTime occurredAt
) {
}
