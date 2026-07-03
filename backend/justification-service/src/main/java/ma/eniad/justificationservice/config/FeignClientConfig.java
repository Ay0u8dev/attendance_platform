package ma.eniad.justificationservice.config;

import feign.Client;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class FeignClientConfig {

    @Bean
    public Client feignClient() {
        return new feign.okhttp.OkHttpClient();
    }

    @Bean
    public feign.RequestInterceptor requestInterceptor(@org.springframework.beans.factory.annotation.Value("${app.internal.service-token:}") String internalServiceToken) {
        return template -> {
            if (internalServiceToken != null && !internalServiceToken.isBlank()) {
                template.header("X-Internal-Service-Token", internalServiceToken);
            }
        };
    }
}
