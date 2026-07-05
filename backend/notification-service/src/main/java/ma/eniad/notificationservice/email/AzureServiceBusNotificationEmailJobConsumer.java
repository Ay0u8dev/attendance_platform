package ma.eniad.notificationservice.email;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.azure.messaging.servicebus.ServiceBusProcessorClient;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.notificationservice.messaging.AzureServiceBusProperties;
import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

@Component
@Profile("prod")
@RequiredArgsConstructor
@Slf4j
public class AzureServiceBusNotificationEmailJobConsumer {

    private final ServiceBusClientBuilder serviceBusClientBuilder;
    private final AzureServiceBusProperties properties;
    private final ObjectMapper objectMapper;
    private final NotificationEmailJobHandler notificationEmailJobHandler;

    private ServiceBusProcessorClient processorClient;

    @PostConstruct
    void start() {
        processorClient = serviceBusClientBuilder
                .processor()
                .queueName(properties.emailQueue())
                .processMessage(context -> {
                    try {
                        EmailNotificationMessage message = objectMapper.readValue(
                                context.getMessage().getBody().toString(),
                                EmailNotificationMessage.class
                        );
                        notificationEmailJobHandler.handle(message);
                    } catch (Exception ex) {
                        log.warn("Failed to process Azure Service Bus email job: {}", ex.getMessage(), ex);
                        throw new IllegalStateException("Failed to process notification email job", ex);
                    }
                })
                .processError(context -> log.warn(
                        "Azure Service Bus email processor error queue={} errorSource={}: {}",
                        properties.emailQueue(),
                        context.getErrorSource(),
                        context.getException().getMessage(),
                        context.getException()
                ))
                .buildProcessorClient();

        processorClient.start();
        log.info("Started Azure Service Bus notification email processor queue={}", properties.emailQueue());
    }

    @PreDestroy
    void stop() {
        if (processorClient != null) {
            processorClient.close();
        }
    }
}
