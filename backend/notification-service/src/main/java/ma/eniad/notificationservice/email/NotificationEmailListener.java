package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
@RequiredArgsConstructor
public class NotificationEmailListener {

    private final NotificationEmailJobHandler notificationEmailJobHandler;

    @RabbitListener(
            queues = "${app.notifications.email.queue:notification-service.email.queue}",
            containerFactory = "notificationRabbitListenerContainerFactory"
    )
    public void handle(EmailNotificationMessage message) {
        notificationEmailJobHandler.handle(message);
    }
}
