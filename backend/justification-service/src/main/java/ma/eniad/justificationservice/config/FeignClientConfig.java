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
}
