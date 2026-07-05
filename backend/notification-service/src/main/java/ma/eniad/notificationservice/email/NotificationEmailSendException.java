package ma.eniad.notificationservice.email;

public class NotificationEmailSendException extends RuntimeException {
    public NotificationEmailSendException(String message, Throwable cause) {
        super(message, cause);
    }
}
