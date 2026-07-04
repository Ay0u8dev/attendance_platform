package ma.eniad.notificationservice.email;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.notifications.email")
public record NotificationEmailProperties(
        boolean enabled,
        String from,
        String senderName,
        String frontendBaseUrl,
        String exchange,
        String queue,
        String routingKey
) {
    public NotificationEmailProperties {
        from = defaultIfBlank(from, "no-reply@attendance.local");
        senderName = defaultIfBlank(senderName, "Plateforme de gestion de l'assiduite");
        frontendBaseUrl = defaultIfBlank(frontendBaseUrl, "http://localhost:4200");
        exchange = defaultIfBlank(exchange, "notifications.email.exchange");
        queue = defaultIfBlank(queue, "notification-service.email.queue");
        routingKey = defaultIfBlank(routingKey, "notification.email.send");
    }

    private static String defaultIfBlank(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
