package ma.eniad.justificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.justificationservice.dto.CreateNotificationRequest;
import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.NotificationChannel;
import ma.eniad.justificationservice.messaging.NotificationEventPublisher;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class JustificationNotificationService {

    private static final String EVENT_SOURCE = "justification-service";
    private static final String ROLE_STUDENT = "STUDENT";
    private static final String ROLE_TEACHER = "TEACHER";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ENTITY_JUSTIFICATION = "JUSTIFICATION";
    private static final Set<NotificationChannel> DEFAULT_CHANNELS =
            Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL);

    private final NotificationEventPublisher notificationEventPublisher;

    public void notifySubmitted(Justification justification) {
        sendSafely(new CreateNotificationRequest(
                justification.getStudentId(),
                ROLE_STUDENT,
                "JUSTIFICATION_SUBMITTED",
                "INFO",
                "Justification submitted",
                "Your justification for " + labelOrFallback(justification.getModule(), "the session")
                        + " was submitted and is pending review.",
                ENTITY_JUSTIFICATION,
                String.valueOf(justification.getId()),
                buildMetadata(justification)
        ), "justification-submitted", justification);
    }

    public void notifySubmittedForTeacher(Justification justification, Long teacherId) {
        sendSafely(new CreateNotificationRequest(
                teacherId,
                ROLE_TEACHER,
                "JUSTIFICATION_REVIEW_REQUESTED",
                "INFO",
                "New justification request",
                labelOrFallback(justification.getStudentName(), "A student")
                        + " submitted a justification for "
                        + labelOrFallback(justification.getModule(), "your session")
                        + ".",
                ENTITY_JUSTIFICATION,
                String.valueOf(justification.getId()),
                buildMetadata(justification)
        ), "justification-review-requested", justification);
    }

    public void notifySubmittedForAdmin(Justification justification, Long adminId) {
        sendSafely(new CreateNotificationRequest(
                adminId,
                ROLE_ADMIN,
                "JUSTIFICATION_REVIEW_REQUESTED",
                "INFO",
                "New justification request",
                labelOrFallback(justification.getStudentName(), "A student")
                        + " submitted a justification for "
                        + labelOrFallback(justification.getModule(), "a session")
                        + ".",
                ENTITY_JUSTIFICATION,
                String.valueOf(justification.getId()),
                buildMetadata(justification)
        ), "justification-review-requested-admin", justification);
    }

    public void notifyApproved(Justification justification) {
        sendSafely(new CreateNotificationRequest(
                justification.getStudentId(),
                ROLE_STUDENT,
                "JUSTIFICATION_APPROVED",
                "SUCCESS",
                "Justification approved",
                "Your justification for " + labelOrFallback(justification.getModule(), "the session")
                        + " was accepted.",
                ENTITY_JUSTIFICATION,
                String.valueOf(justification.getId()),
                buildMetadata(justification)
        ), "justification-approved", justification);
    }

    public void notifyRejected(Justification justification) {
        sendSafely(new CreateNotificationRequest(
                justification.getStudentId(),
                ROLE_STUDENT,
                "JUSTIFICATION_REJECTED",
                "DANGER",
                "Justification rejected",
                "Your justification for " + labelOrFallback(justification.getModule(), "the session")
                        + " was rejected.",
                ENTITY_JUSTIFICATION,
                String.valueOf(justification.getId()),
                buildMetadata(justification)
        ), "justification-rejected", justification);
    }

    private void sendSafely(CreateNotificationRequest request, String event, Justification justification) {
        try {
            notificationEventPublisher.publish(toEvent(request, justification));
        } catch (RuntimeException ex) {
            log.warn(
                    "Notification publish failed for event={} justificationId={} studentId={}: {}",
                    event,
                    justification.getId(),
                    justification.getStudentId(),
                    ex.getMessage(),
                    ex
            );
        }
    }

    private NotificationRequestedEvent toEvent(CreateNotificationRequest request, Justification justification) {
        return new NotificationRequestedEvent(
                UUID.randomUUID().toString(),
                EVENT_SOURCE,
                request.type(),
                request.recipientUserId(),
                request.recipientRole(),
                recipientEmail(request, justification),
                recipientName(request, justification),
                request.title(),
                request.message(),
                request.severity(),
                request.relatedEntityType(),
                request.relatedEntityId(),
                DEFAULT_CHANNELS,
                request.metadataJson(),
                LocalDateTime.now()
        );
    }

    private String recipientName(CreateNotificationRequest request, Justification justification) {
        if (ROLE_STUDENT.equals(request.recipientRole())) {
            return labelOrFallback(justification.getStudentName(), null);
        }
        return null;
    }

    private String recipientEmail(CreateNotificationRequest request, Justification justification) {
        if (ROLE_STUDENT.equals(request.recipientRole())) {
            return labelOrFallback(justification.getStudentEmail(), null);
        }
        return null;
    }

    private String buildMetadata(Justification justification) {
        return "{\"sessionId\":" + justification.getSessionId()
                + ",\"studentId\":" + justification.getStudentId()
                + ",\"justificationId\":" + justification.getId()
                + ",\"status\":\"" + (justification.getStatus() == null ? "" : justification.getStatus().name()) + "\""
                + ",\"module\":\"" + jsonEscape(labelOrFallback(justification.getModule(), "")) + "\""
                + ",\"sessionDate\":\"" + nullSafe(justification.getSessionDate()) + "\""
                + ",\"decisionComment\":\"" + jsonEscape(labelOrFallback(justification.getTeacherComment(), "")) + "\""
                + ",\"reviewedBy\":\"" + jsonEscape(labelOrFallback(justification.getReviewedBy(), "")) + "\""
                + ",\"reviewerRole\":\"" + jsonEscape(labelOrFallback(justification.getReviewerRole(), "")) + "\""
                + ",\"reviewedAt\":\"" + nullSafe(justification.getReviewedAt()) + "\"}";
    }

    private String labelOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private String nullSafe(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String jsonEscape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }
}
