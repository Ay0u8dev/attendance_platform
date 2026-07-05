package ma.eniad.notificationservice.email;

import ma.eniad.notificationservice.entity.enums.NotificationType;

import java.time.LocalDateTime;

public record EmailNotificationMessage(
        String emailJobId,
        Long notificationId,
        Long recipientUserId,
        String recipientEmail,
        String recipientName,
        NotificationType notificationType,
        String subject,
        String templateName,
        String relatedEntityType,
        String relatedEntityId,
        String metadataJson,
        LocalDateTime requestedAt
) {
}
