package ma.eniad.notificationservice.email;

public interface NotificationEmailJobPublisher {

    void publish(EmailNotificationMessage message);
}
