package ma.eniad.justificationservice.config;

import ma.eniad.justificationservice.messaging.NotificationRabbitProperties;
import org.springframework.amqp.support.converter.JacksonJsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("!prod")
@EnableConfigurationProperties(NotificationRabbitProperties.class)
public class NotificationRabbitMqConfig {

    @Bean
    public MessageConverter notificationMessageConverter() {
        return new JacksonJsonMessageConverter();
    }
}
