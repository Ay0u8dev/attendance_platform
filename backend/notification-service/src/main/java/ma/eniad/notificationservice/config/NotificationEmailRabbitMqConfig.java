package ma.eniad.notificationservice.config;

import ma.eniad.notificationservice.email.NotificationEmailProperties;
import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
@EnableConfigurationProperties(NotificationEmailProperties.class)
public class NotificationEmailRabbitMqConfig {

    @Bean
    public DirectExchange notificationEmailExchange(NotificationEmailProperties properties) {
        return new DirectExchange(properties.exchange(), true, false);
    }

    @Bean
    public Queue notificationEmailQueue(NotificationEmailProperties properties) {
        return new Queue(properties.queue(), true);
    }

    @Bean
    public Binding notificationEmailBinding(
            Queue notificationEmailQueue,
            DirectExchange notificationEmailExchange,
            NotificationEmailProperties properties
    ) {
        return BindingBuilder.bind(notificationEmailQueue)
                .to(notificationEmailExchange)
                .with(properties.routingKey());
    }
}
