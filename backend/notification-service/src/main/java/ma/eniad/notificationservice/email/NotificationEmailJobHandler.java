package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.EmailStatus;
import ma.eniad.notificationservice.repository.NotificationRepository;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEmailJobHandler {

    private final NotificationRepository notificationRepository;
    private final NotificationEmailTemplateService templateService;
    private final NotificationEmailSender sender;
    private final NotificationEmailStatusService statusService;

    public void handle(EmailNotificationMessage message) {
        if (message == null || message.notificationId() == null) {
            log.warn("Ignoring invalid email notification message");
            return;
        }

        Notification notification = notificationRepository.findById(message.notificationId()).orElse(null);
        if (notification == null) {
            log.warn("Ignoring email notification message because notificationId={} was not found", message.notificationId());
            return;
        }

        if (notification.getEmailStatus() == EmailStatus.SENT) {
            log.debug("Ignoring already sent email notificationId={}", notification.getId());
            return;
        }

        if (message.recipientEmail() == null || message.recipientEmail().isBlank()) {
            statusService.markSkipped(notification.getId(), "Missing recipient email");
            return;
        }

        try {
            EmailTemplateContent content = templateService.build(message, notification);
            sender.send(message, content);
            statusService.markSent(notification.getId());
        } catch (RuntimeException ex) {
            // TODO: add retry and DLQ once operational retry policy is defined.
            log.warn(
                    "Notification email failed notificationId={} recipientUserId={} type={}: {}",
                    message.notificationId(),
                    message.recipientUserId(),
                    message.notificationType(),
                    ex.getMessage(),
                    ex
            );
            statusService.markFailed(notification.getId(), safeMessage(ex));
        }
    }

    private String safeMessage(RuntimeException ex) {
        if (ex.getCause() != null && ex.getCause().getMessage() != null) {
            return ex.getCause().getMessage();
        }
        return ex.getMessage();
    }
}
