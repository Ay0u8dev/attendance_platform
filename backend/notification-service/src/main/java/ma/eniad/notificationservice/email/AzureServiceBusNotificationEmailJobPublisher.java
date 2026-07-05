package ma.eniad.notificationservice.email;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusMessage;
import com.azure.messaging.servicebus.ServiceBusSenderClient;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.messaging.AzureServiceBusProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
public class AzureServiceBusNotificationEmailJobPublisher implements NotificationEmailJobPublisher {

    private final ServiceBusClientBuilder serviceBusClientBuilder;
    private final AzureServiceBusProperties properties;
    private final ObjectMapper objectMapper;

    @Override
    public void publish(EmailNotificationMessage message) {
        try (ServiceBusSenderClient senderClient = serviceBusClientBuilder
                .sender()
                .queueName(properties.emailQueue())
                .buildClient()) {
            senderClient.sendMessage(new ServiceBusMessage(objectMapper.writeValueAsString(message)));
        } catch (JsonProcessingException ex) {
            throw new IllegalArgumentException("Failed to serialize notification email job", ex);
        }
    }
}
