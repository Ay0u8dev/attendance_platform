package ma.eniad.justificationservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.justificationservice.client.NotificationServiceClient;
import ma.eniad.justificationservice.dto.CreateNotificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class JustificationNotificationService {

    private static final String REQUEST_SOURCE = "justification-service";
    private static final String ROLE_STUDENT = "STUDENT";
    private static final String ROLE_TEACHER = "TEACHER";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ENTITY_JUSTIFICATION = "JUSTIFICATION";

    private final NotificationServiceClient notificationServiceClient;

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
            notificationServiceClient.createNotification(REQUEST_SOURCE, request);
        } catch (RuntimeException ex) {
            log.warn(
                    "Notification send failed for event={} justificationId={} studentId={}: {}",
                    event,
                    justification.getId(),
                    justification.getStudentId(),
                    ex.getMessage(),
                    ex
            );
        }
    }

    private String buildMetadata(Justification justification) {
        return "{\"sessionId\":" + justification.getSessionId()
                + ",\"studentId\":" + justification.getStudentId() + "}";
    }

    private String labelOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }
}
