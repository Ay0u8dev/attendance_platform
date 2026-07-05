package ma.eniad.notificationservice.email;

import lombok.RequiredArgsConstructor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
@RequiredArgsConstructor
public class RabbitNotificationEmailJobPublisher implements NotificationEmailJobPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NotificationEmailProperties properties;

    @Override
    public void publish(EmailNotificationMessage message) {
        rabbitTemplate.convertAndSend(properties.exchange(), properties.routingKey(), message);
    }
}
