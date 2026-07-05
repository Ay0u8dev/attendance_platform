package ma.eniad.justificationservice.messaging;

import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("!prod")
@RequiredArgsConstructor
public class RabbitNotificationEventPublisher implements NotificationEventPublisher {

    private final RabbitTemplate rabbitTemplate;
    private final NotificationRabbitProperties properties;
    private final MeterRegistry meterRegistry;

    @Override
    public void publish(NotificationRequestedEvent event) {
        try {
            rabbitTemplate.convertAndSend(properties.exchange(), properties.routingKey(), event);
            increment("success");
        } catch (RuntimeException ex) {
            increment("failure");
            throw ex;
        }
    }

    private void increment(String outcome) {
        meterRegistry.counter(
                "notification_events_published_total",
                "transport", "rabbitmq",
                "outcome", outcome
        ).increment();
    }
}
