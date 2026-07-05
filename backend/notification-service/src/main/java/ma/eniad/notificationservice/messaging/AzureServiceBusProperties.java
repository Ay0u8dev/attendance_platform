package ma.eniad.notificationservice.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.azure.servicebus")
public record AzureServiceBusProperties(
        String connectionString,
        String notificationsQueue,
        String emailQueue
) {
    public AzureServiceBusProperties {
        notificationsQueue = defaultIfBlank(notificationsQueue, "notification-service-notifications");
        emailQueue = defaultIfBlank(emailQueue, "notification-service-email");
    }

    public String requiredConnectionString() {
        if (connectionString == null || connectionString.isBlank()) {
            throw new IllegalStateException("app.azure.servicebus.connection-string must be configured in prod");
        }
        return connectionString.trim();
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
