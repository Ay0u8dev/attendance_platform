package ma.eniad.attendanceservice.dto;

public record CreateNotificationRequest(
        Long recipientUserId,
        String recipientRole,
        String type,
        String severity,
        String title,
        String message,
        String relatedEntityType,
        String relatedEntityId,
        String metadataJson
) {
}
