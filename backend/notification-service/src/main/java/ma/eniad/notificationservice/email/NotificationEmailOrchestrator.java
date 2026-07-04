package ma.eniad.notificationservice.email;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.EmailStatus;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEmailOrchestrator {

    private final NotificationEmailProperties properties;
    private final NotificationEmailJobPublisher publisher;
    private final NotificationEmailStatusService statusService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    public void applyInitialEmailState(Notification notification) {
        if (!requiresEmail(notification)) {
            notification.setEmailStatus(EmailStatus.NOT_REQUIRED);
            return;
        }

        if (!properties.enabled()) {
            notification.setEmailStatus(EmailStatus.SKIPPED);
            notification.setEmailError("Email notifications are disabled");
            return;
        }

        if (!hasText(notification.getRecipientEmail())) {
            notification.setEmailStatus(EmailStatus.SKIPPED);
            notification.setEmailError("Missing recipient email");
            return;
        }

        notification.setEmailStatus(EmailStatus.PENDING);
        notification.setEmailError(null);
    }

    public void enqueueAfterCommit(Notification notification) {
        if (notification.getEmailStatus() != EmailStatus.PENDING || notification.getId() == null) {
            return;
        }

        EmailNotificationMessage message = new EmailNotificationMessage(
                UUID.randomUUID().toString(),
                notification.getId(),
                notification.getRecipientUserId(),
                notification.getRecipientEmail(),
                notification.getRecipientName(),
                notification.getType(),
                subjectFor(notification),
                templateNameFor(notification),
                notification.getRelatedEntityType(),
                notification.getRelatedEntityId(),
                notification.getMetadataJson(),
                LocalDateTime.now()
        );

        Runnable publish = () -> {
            try {
                publisher.publish(message);
            } catch (RuntimeException ex) {
                log.warn(
                        "Failed to enqueue notification email job notificationId={} recipientUserId={} type={}: {}",
                        notification.getId(),
                        notification.getRecipientUserId(),
                        notification.getType(),
                        ex.getMessage(),
                        ex
                );
                statusService.markFailed(notification.getId(), ex.getMessage());
            }
        };

        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            publish.run();
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                publish.run();
            }
        });
    }

    public boolean requiresEmail(Notification notification) {
        NotificationType type = notification.getType();
        if (type == NotificationType.ABSENCE_RECORDED || isAbsenceWarning(type)) {
            return true;
        }
        if (type == NotificationType.JUSTIFICATION_APPROVED || type == NotificationType.JUSTIFICATION_REJECTED) {
            return true;
        }
        if (type == NotificationType.JUSTIFICATION_STATUS_CHANGED) {
            String status = metadataText(notification.getMetadataJson(), "status");
            return isApprovedStatus(status) || isRejectedStatus(status);
        }
        return false;
    }

    private String subjectFor(Notification notification) {
        if (notification.getType() == NotificationType.ABSENCE_RECORDED) {
            return "Absence enregistree";
        }
        if (isAbsenceWarning(notification.getType())) {
            return "Avertissement d'absence";
        }
        if (notification.getType() == NotificationType.JUSTIFICATION_APPROVED
                || isApprovedStatus(metadataText(notification.getMetadataJson(), "status"))) {
            return "Justification acceptee";
        }
        return "Justification refusee";
    }

    private String templateNameFor(Notification notification) {
        if (notification.getType() == NotificationType.ABSENCE_RECORDED) {
            return "absence-recorded";
        }
        if (isAbsenceWarning(notification.getType())) {
            return "absence-warning";
        }
        if (notification.getType() == NotificationType.JUSTIFICATION_APPROVED
                || isApprovedStatus(metadataText(notification.getMetadataJson(), "status"))) {
            return "justification-approved";
        }
        return "justification-rejected";
    }

    private String metadataText(String metadataJson, String field) {
        if (!hasText(metadataJson)) {
            return null;
        }
        try {
            JsonNode node = objectMapper.readTree(metadataJson);
            return node.path(field).asText(null);
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isApprovedStatus(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return "APPROVED".equals(normalized) || "ACCEPTED".equals(normalized) || "ACCEPTEE".equals(normalized);
    }

    private boolean isAbsenceWarning(NotificationType type) {
        return type == NotificationType.ABSENCE_AVERTISSMENT
                || type == NotificationType.ABSENCE_AVERTISSEMENT
                || type == NotificationType.ABSENCE_THRESHOLD_EXCEEDED;
    }

    private boolean isRejectedStatus(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.trim().toUpperCase(Locale.ROOT);
        return "REJECTED".equals(normalized) || "REFUSED".equals(normalized) || "REFUSEE".equals(normalized);
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
