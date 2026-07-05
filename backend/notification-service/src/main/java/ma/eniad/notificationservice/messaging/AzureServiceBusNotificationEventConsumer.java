package ma.eniad.notificationservice.messaging;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusProcessorClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.notificationservice.dto.NotificationRequestedEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
@Slf4j
public class AzureServiceBusNotificationEventConsumer {

    private final ServiceBusClientBuilder serviceBusClientBuilder;
    private final AzureServiceBusProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationEventHandler notificationEventHandler;

    private ServiceBusProcessorClient processorClient;

    @PostConstruct
    void start() {
        processorClient = serviceBusClientBuilder
                .processor()
                .queueName(properties.notificationsQueue())
                .processMessage(context -> {
                    try {
                        NotificationRequestedEvent event = objectMapper.readValue(
                                context.getMessage().getBody().toString(),
                                NotificationRequestedEvent.class
                        );
                        notificationEventHandler.handle(event);
                    } catch (Exception ex) {
                        log.warn("Failed to process Azure Service Bus notification event: {}", ex.getMessage(), ex);
                        throw new IllegalStateException("Failed to process notification event", ex);
                    }
                })
                .processError(context -> log.warn(
                        "Azure Service Bus notification processor error queue={} errorSource={}: {}",
                        properties.notificationsQueue(),
                        context.getErrorSource(),
                        context.getException().getMessage(),
                        context.getException()
                ))
                .buildProcessorClient();

        processorClient.start();
        log.info("Started Azure Service Bus notification processor queue={}", properties.notificationsQueue());
    }

    @PreDestroy
    void stop() {
        if (processorClient != null) {
            processorClient.close();
        }
    }
}
