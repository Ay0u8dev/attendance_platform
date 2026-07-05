package ma.eniad.attendanceservice.messaging;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.rabbitmq.notifications")
public record NotificationRabbitProperties(
        String exchange,
        String routingKey
) {
    public NotificationRabbitProperties {
        exchange = defaultIfBlank(exchange, "notifications.exchange");
        routingKey = defaultIfBlank(routingKey, "notification.requested");
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value;
    }
}
