package ma.eniad.notificationservice.messaging;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.dto.NotificationRequestedEvent;

import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
@RequiredArgsConstructor
public class NotificationEventConsumer {

    private final NotificationEventHandler notificationEventHandler;

    @RabbitListener(
            queues = "${app.rabbitmq.notifications.queue:notification-service.notifications.queue}",
            containerFactory = "notificationRabbitListenerContainerFactory"
    )
    public void handle(NotificationRequestedEvent event) {
        notificationEventHandler.handle(event);
    }
}
