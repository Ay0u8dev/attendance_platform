package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationEmailJobPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NotificationEmailProperties properties;

    public void publish(EmailNotificationMessage message) {
        rabbitTemplate.convertAndSend(properties.exchange(), properties.routingKey(), message);
    }
}
