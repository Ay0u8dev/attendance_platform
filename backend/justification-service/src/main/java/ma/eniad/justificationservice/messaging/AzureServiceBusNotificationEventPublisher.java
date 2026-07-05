package ma.eniad.justificationservice.messaging;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import io.micrometer.core.instrument.MeterRegistry;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class AzureServiceBusNotificationEventPublisher implements NotificationEventPublisher {

    private final ServiceBusClientBuilder serviceBusClientBuilder;
    private final AzureServiceBusProperties properties;
    private final ObjectMapper objectMapper;
    private final MeterRegistry meterRegistry;

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
            increment("success");
        } catch (JsonProcessingException ex) {
            increment("serialization_failure");
            throw new IllegalArgumentException("Failed to serialize notification event", ex);
        } catch (RuntimeException ex) {
            increment("failure");
            throw ex;
        }
    }

    private void increment(String outcome) {
        meterRegistry.counter(
                "notification_events_published_total",
                "transport", "azure_service_bus",
                "outcome", outcome
        ).increment();
    }
}
