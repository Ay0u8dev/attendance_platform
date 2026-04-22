package ma.eniad.authservice.configs;

import feign.RequestInterceptor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignClientConfig {

    @Value("${spring.application.name:unknown-service}")
    private String applicationName;

    @Bean
    public RequestInterceptor requestInterceptor() {
        return template -> {
            // Inject the custom header
            template.header("X-Request-Source", applicationName);
        };
    }
}
