package ma.eniad.justificationservice.messaging;

import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import ma.eniad.justificationservice.entity.enums.NotificationChannel;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class RabbitNotificationEventPublisherTest {

    @Test
    void publishesToConfiguredExchangeAndRoutingKey() {
        RabbitTemplate rabbitTemplate = mock(RabbitTemplate.class);
        RabbitNotificationEventPublisher publisher = new RabbitNotificationEventPublisher(
                rabbitTemplate,
                new NotificationRabbitProperties("notifications.exchange", "notification.requested")
        );
        NotificationRequestedEvent event = event();

        publisher.publish(event);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(rabbitTemplate).convertAndSend(eq("notifications.exchange"), eq("notification.requested"), captor.capture());
        assertThat(captor.getValue()).isEqualTo(event);
    }

    private NotificationRequestedEvent event() {
        return new NotificationRequestedEvent(
                "evt-1",
                "justification-service",
                "JUSTIFICATION_APPROVED",
                42L,
                "STUDENT",
                "student@example.test",
                "Student Name",
                "Justification accepted",
                "Your justification was accepted.",
                "SUCCESS",
                "JUSTIFICATION",
                "9",
                Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET),
                "{\"status\":\"APPROVED\"}",
                LocalDateTime.now()
        );
    }
}
