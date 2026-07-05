package ma.eniad.notificationservice.config;

import ma.eniad.notificationservice.email.NotificationEmailProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationEmailProperties.class)
public class NotificationEmailPropertiesConfig {
}
