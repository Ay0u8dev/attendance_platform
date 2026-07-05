package ma.eniad.attendanceservice.messaging;

import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;
import ma.eniad.attendanceservice.entity.enums.NotificationChannel;
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
                "attendance-service",
                "ABSENCE_RECORDED",
                42L,
                "STUDENT",
                "student@example.test",
                "Student Name",
                "Absence recorded",
                "You were marked absent.",
                "WARNING",
                "ATTENDANCE_SESSION",
                "100",
                Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET),
                "{\"sessionId\":100}",
                LocalDateTime.now()
        );
    }
}
