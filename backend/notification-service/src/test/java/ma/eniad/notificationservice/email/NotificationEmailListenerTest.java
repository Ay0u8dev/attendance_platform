package ma.eniad.notificationservice.email;

import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.EmailStatus;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import ma.eniad.notificationservice.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationEmailListenerTest {

    private NotificationRepository notificationRepository;
    private NotificationEmailTemplateService templateService;
    private NotificationEmailSender sender;
    private NotificationEmailStatusService statusService;
    private NotificationEmailJobHandler handler;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        templateService = mock(NotificationEmailTemplateService.class);
        sender = mock(NotificationEmailSender.class);
        statusService = mock(NotificationEmailStatusService.class);
        handler = new NotificationEmailJobHandler(notificationRepository, templateService, sender, statusService);
    }

    @Test
    void marksSentWhenEmailSucceeds() {
        Notification notification = notification(EmailStatus.PENDING);
        EmailNotificationMessage message = message();
        when(notificationRepository.findById(99L)).thenReturn(Optional.of(notification));
        when(templateService.build(message, notification)).thenReturn(new EmailTemplateContent("Subject", "Plain", "<p>Html</p>"));

        handler.handle(message);

        verify(sender).send(any(EmailNotificationMessage.class), any(EmailTemplateContent.class));
        verify(statusService).markSent(99L);
    }

    @Test
    void marksFailedWhenEmailSenderFails() {
        Notification notification = notification(EmailStatus.PENDING);
        EmailNotificationMessage message = message();
        when(notificationRepository.findById(99L)).thenReturn(Optional.of(notification));
        when(templateService.build(message, notification)).thenReturn(new EmailTemplateContent("Subject", "Plain", "<p>Html</p>"));
        doThrow(new NotificationEmailSendException("failed", new RuntimeException("smtp down")))
                .when(sender).send(any(EmailNotificationMessage.class), any(EmailTemplateContent.class));

        handler.handle(message);

        verify(statusService).markFailed(99L, "smtp down");
    }

    @Test
    void ignoresAlreadySentNotification() {
        Notification notification = notification(EmailStatus.SENT);
        when(notificationRepository.findById(99L)).thenReturn(Optional.of(notification));

        handler.handle(message());

        verify(sender, never()).send(any(), any());
        verify(statusService, never()).markSent(99L);
    }

    private Notification notification(EmailStatus status) {
        return Notification.builder()
                .id(99L)
                .recipientUserId(10L)
                .recipientEmail("student@example.test")
                .recipientName("Student Name")
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.JUSTIFICATION_APPROVED)
                .title("Approved")
                .message("Approved")
                .emailStatus(status)
                .build();
    }

    private EmailNotificationMessage message() {
        return new EmailNotificationMessage(
                "job-1",
                99L,
                10L,
                "student@example.test",
                "Student Name",
                NotificationType.JUSTIFICATION_APPROVED,
                "Justification acceptee",
                "justification-approved",
                "JUSTIFICATION",
                "7",
                "{\"status\":\"APPROVED\"}",
                LocalDateTime.now()
        );
    }
}
