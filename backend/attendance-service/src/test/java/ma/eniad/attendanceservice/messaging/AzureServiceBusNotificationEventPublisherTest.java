package ma.eniad.attendanceservice.messaging;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;
import ma.eniad.attendanceservice.entity.enums.NotificationChannel;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AzureServiceBusNotificationEventPublisherTest {

    @Test
    void publishesSerializedEventToConfiguredQueue() {
        ServiceBusClientBuilder serviceBusClientBuilder = mock(ServiceBusClientBuilder.class);
        ServiceBusClientBuilder.ServiceBusSenderClientBuilder senderBuilder =
                mock(ServiceBusClientBuilder.ServiceBusSenderClientBuilder.class);
        ServiceBusSenderClient senderClient = mock(ServiceBusSenderClient.class);
        when(serviceBusClientBuilder.sender()).thenReturn(senderBuilder);
        when(senderBuilder.queueName("notification-service-notifications")).thenReturn(senderBuilder);
        when(senderBuilder.buildClient()).thenReturn(senderClient);
        AzureServiceBusNotificationEventPublisher publisher = new AzureServiceBusNotificationEventPublisher(
                serviceBusClientBuilder,
                new AzureServiceBusProperties("Endpoint=sb://example.servicebus.windows.net/;SharedAccessKeyName=test;SharedAccessKey=test", "notification-service-notifications"),
                new ObjectMapper().findAndRegisterModules(),
                new SimpleMeterRegistry()
        );

        publisher.publish(event());

        ArgumentCaptor<ServiceBusMessage> captor = ArgumentCaptor.forClass(ServiceBusMessage.class);
        verify(senderBuilder).queueName("notification-service-notifications");
        verify(senderClient).sendMessage(captor.capture());
        verify(senderClient).close();
        assertThat(captor.getValue().getMessageId()).isEqualTo("evt-1");
        assertThat(captor.getValue().getBody().toString()).contains("\"eventSource\":\"attendance-service\"");
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
