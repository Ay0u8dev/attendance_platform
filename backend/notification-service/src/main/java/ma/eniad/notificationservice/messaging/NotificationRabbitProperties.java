package ma.eniad.notificationservice.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rabbitmq.notifications")
public record NotificationRabbitProperties(
        String exchange,
        String queue,
        String routingKey
) {
    public NotificationRabbitProperties {
        exchange = defaultIfBlank(exchange, "notifications.exchange");
        queue = defaultIfBlank(queue, "notification-service.notifications.queue");
        routingKey = defaultIfBlank(routingKey, "notification.requested");
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
