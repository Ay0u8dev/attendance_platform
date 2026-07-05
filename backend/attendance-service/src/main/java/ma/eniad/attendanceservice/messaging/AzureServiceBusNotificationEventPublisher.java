package ma.eniad.attendanceservice.messaging;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class AzureServiceBusNotificationEventPublisher implements NotificationEventPublisher {

    private final ServiceBusClientBuilder serviceBusClientBuilder;
    private final AzureServiceBusProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public void publish(NotificationRequestedEvent event) {
        try (ServiceBusSenderClient senderClient = serviceBusClientBuilder
                .sender()
                .queueName(properties.notificationsQueue())
                .buildClient()) {
            ServiceBusMessage message = new ServiceBusMessage(objectMapper.writeValueAsString(event));
            if (event != null && event.eventId() != null && !event.eventId().isBlank()) {
                message.setMessageId(event.eventId());
            }
            senderClient.sendMessage(message);
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialize notification event", ex);
        }
    }
}
