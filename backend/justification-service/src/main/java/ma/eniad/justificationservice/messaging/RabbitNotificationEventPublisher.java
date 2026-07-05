package ma.eniad.justificationservice.messaging;

import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
@RequiredArgsConstructor
public class RabbitNotificationEventPublisher implements NotificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NotificationRabbitProperties properties;

    @Override
    public void publish(NotificationRequestedEvent event) {
        rabbitTemplate.convertAndSend(properties.exchange(), properties.routingKey(), event);
    }
}
