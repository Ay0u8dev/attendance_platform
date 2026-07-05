package ma.eniad.notificationservice.email;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.EmailStatus;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

class NotificationEmailOrchestratorTest {

    @Test
    void nonEmailNotificationIsNotRequired() {
        NotificationEmailOrchestrator orchestrator = orchestrator(false);
        Notification notification = notification(NotificationType.ATTENDANCE_SESSION_STARTED, null);

        orchestrator.applyInitialEmailState(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.NOT_REQUIRED);
    }

    @Test
    void emailDisabledSkipsRequiredEmail() {
        NotificationEmailOrchestrator orchestrator = orchestrator(false);
        Notification notification = notification(NotificationType.ABSENCE_RECORDED, "student@example.test");

        orchestrator.applyInitialEmailState(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.SKIPPED);
        assertThat(notification.getEmailError()).contains("disabled");
    }

    @Test
    void missingRecipientEmailSkipsRequiredEmail() {
        NotificationEmailOrchestrator orchestrator = orchestrator(true);
        Notification notification = notification(NotificationType.JUSTIFICATION_APPROVED, null);

        orchestrator.applyInitialEmailState(notification);
        orchestrator.enqueueAfterCommit(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.SKIPPED);
    }

    @Test
    void requiredEmailPublishesJobWhenEnabled() {
        NotificationEmailJobPublisher publisher = mock(NotificationEmailJobPublisher.class);
        NotificationEmailOrchestrator orchestrator = orchestrator(true, publisher);
        Notification notification = notification(NotificationType.JUSTIFICATION_REJECTED, "student@example.test");
        notification.setId(99L);

        orchestrator.applyInitialEmailState(notification);
        orchestrator.enqueueAfterCommit(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.PENDING);
        verify(publisher).publish(any(EmailNotificationMessage.class));
    }

    @Test
    void absenceThresholdExceededPublishesJobWhenEnabled() {
        NotificationEmailJobPublisher publisher = mock(NotificationEmailJobPublisher.class);
        NotificationEmailOrchestrator orchestrator = orchestrator(true, publisher);
        Notification notification = notification(NotificationType.ABSENCE_THRESHOLD_EXCEEDED, "student@example.test");
        notification.setId(100L);
        notification.setMetadataJson("{\"absenceCount\":4}");

        orchestrator.applyInitialEmailState(notification);
        orchestrator.enqueueAfterCommit(notification);

        assertThat(notification.getEmailStatus()).isEqualTo(EmailStatus.PENDING);
        verify(publisher).publish(any(EmailNotificationMessage.class));
    }

    @Test
    void statusChangedOnlyRequiresApprovedOrRejectedEmail() {
        NotificationEmailOrchestrator orchestrator = orchestrator(true);
        Notification approved = notification(NotificationType.JUSTIFICATION_STATUS_CHANGED, "student@example.test");
        approved.setMetadataJson("{\"status\":\"APPROVED\"}");
        Notification pending = notification(NotificationType.JUSTIFICATION_STATUS_CHANGED, "student@example.test");
        pending.setMetadataJson("{\"status\":\"PENDING\"}");

        orchestrator.applyInitialEmailState(approved);
        orchestrator.applyInitialEmailState(pending);

        assertThat(approved.getEmailStatus()).isEqualTo(EmailStatus.PENDING);
        assertThat(pending.getEmailStatus()).isEqualTo(EmailStatus.NOT_REQUIRED);
    }

    private NotificationEmailOrchestrator orchestrator(boolean enabled) {
        return orchestrator(enabled, mock(NotificationEmailJobPublisher.class));
    }

    private NotificationEmailOrchestrator orchestrator(boolean enabled, NotificationEmailJobPublisher publisher) {
        NotificationEmailProperties properties = new NotificationEmailProperties(
                enabled,
                "no-reply@attendance.local",
                "Test",
                "http://localhost:4200",
                "notifications.email.exchange",
                "notification-service.email.queue",
                "notification.email.send"
        );
        return new NotificationEmailOrchestrator(
                properties,
                publisher,
                mock(NotificationEmailStatusService.class),
                new SimpleMeterRegistry()
        );
    }

    private Notification notification(NotificationType type, String email) {
        return Notification.builder()
                .recipientUserId(10L)
                .recipientEmail(email)
                .recipientName("Student Name")
                .recipientRole(RecipientRole.STUDENT)
                .type(type)
                .title("Title")
                .message("Message")
                .relatedEntityType("JUSTIFICATION")
                .relatedEntityId("1")
                .build();
    }
}
