package ma.eniad.notificationservice.email;

import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class NotificationEmailTemplateServiceTest {

    @Test
    void templateDoesNotRenderNullOrUndefined() {
        NotificationEmailTemplateService templateService = new NotificationEmailTemplateService(properties());
        Notification notification = Notification.builder()
                .recipientUserId(10L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.ABSENCE_RECORDED)
                .title("Absence")
                .message("Absent")
                .metadataJson("{\"courseLabel\":null,\"roomLabel\":\"undefined\",\"teacherFullName\":\"M. Test\"}")
                .build();

        EmailTemplateContent content = templateService.build(message(), notification);

        assertThat(content.plainText()).doesNotContain("null", "undefined");
        assertThat(content.html()).doesNotContain("null", "undefined");
        assertThat(content.subject()).isEqualTo("Absence enregistree");
    }

    private NotificationEmailProperties properties() {
        return new NotificationEmailProperties(
                true,
                "no-reply@attendance.local",
                "Test",
                "http://localhost:4200",
                "notifications.email.exchange",
                "notification-service.email.queue",
                "notification.email.send"
        );
    }

    private EmailNotificationMessage message() {
        return new EmailNotificationMessage(
                "job-1",
                99L,
                10L,
                "student@example.test",
                null,
                NotificationType.ABSENCE_RECORDED,
                "Absence enregistree",
                "absence-recorded",
                "ATTENDANCE_SESSION",
                "7",
                "{}",
                LocalDateTime.now()
        );
    }
}
