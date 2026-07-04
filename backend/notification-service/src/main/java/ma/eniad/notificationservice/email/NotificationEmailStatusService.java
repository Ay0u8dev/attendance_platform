package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.EmailStatus;
import ma.eniad.notificationservice.repository.NotificationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationEmailStatusService {

    private static final int MAX_ERROR_LENGTH = 500;

    private final NotificationRepository notificationRepository;

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSent(Long notificationId) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setEmailStatus(EmailStatus.SENT);
            notification.setEmailSentAt(LocalDateTime.now());
            notification.setEmailError(null);
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markFailed(Long notificationId, String error) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setEmailStatus(EmailStatus.FAILED);
            notification.setEmailError(shortError(error));
        });
    }

    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void markSkipped(Long notificationId, String reason) {
        notificationRepository.findById(notificationId).ifPresent(notification -> {
            notification.setEmailStatus(EmailStatus.SKIPPED);
            notification.setEmailError(shortError(reason));
        });
    }

    private String shortError(String error) {
        if (error == null || error.isBlank()) {
            return null;
        }
        String normalized = error.trim();
        return normalized.length() <= MAX_ERROR_LENGTH
                ? normalized
                : normalized.substring(0, MAX_ERROR_LENGTH);
    }
}
