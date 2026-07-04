package ma.eniad.notificationservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;

public record CreateNotificationRequest(
    @NotNull
    Long recipientUserId,

    @NotNull
    RecipientRole recipientRole,

    @NotNull
    NotificationType type,

    NotificationSeverity severity,

    @NotBlank
    @Size(max = 180)
    String title,

    @NotBlank
    @Size(max = 1000)
    String message,

    @Size(max = 80)
    String relatedEntityType,

    @Size(max = 120)
    String relatedEntityId,

    String metadataJson
) {
    
}
