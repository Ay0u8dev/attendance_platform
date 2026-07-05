package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;
import java.util.Set;

import ma.eniad.attendanceservice.entity.enums.NotificationChannel;

public record NotificationRequestedEvent(
        String eventId,
        String eventSource,
        String type,
        Long recipientUserId,
        String recipientRole,
        String recipientEmail,
        String recipientName,
        String title,
        String message,
        String severity,
        String relatedEntityType,
        String relatedEntityId,
        Set<NotificationChannel> channels,
        String metadataJson,
        LocalDateTime occurredAt
) {
}
