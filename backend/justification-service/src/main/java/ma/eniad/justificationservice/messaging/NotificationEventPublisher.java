package ma.eniad.justificationservice.messaging;

import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.dto.NotificationRequestedEvent;

import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class NotificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NotificationRabbitProperties properties;

    public void publish(NotificationRequestedEvent event) {
        rabbitTemplate.convertAndSend(properties.exchange(), properties.routingKey(), event);
    }
}
