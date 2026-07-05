package ma.eniad.attendanceservice.config;

import com.azure.messaging.servicebus.ServiceBusClientBuilder;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.eniad.attendanceservice.messaging.AzureServiceBusProperties;
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

    @Bean
    public ObjectMapper serviceBusObjectMapper() {
        return new ObjectMapper().findAndRegisterModules();
    }
}
