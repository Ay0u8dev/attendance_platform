package ma.eniad.justificationservice.config;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import ma.eniad.justificationservice.messaging.AzureServiceBusProperties;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("prod")
@EnableConfigurationProperties(AzureServiceBusProperties.class)
public class AzureServiceBusConfig {

    @Bean
    public ServiceBusClientBuilder serviceBusClientBuilder(AzureServiceBusProperties properties) {
        return new ServiceBusClientBuilder()
                .connectionString(properties.requiredConnectionString());
    }
}
