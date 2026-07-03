package ma.eniad.justificationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

import ma.eniad.justificationservice.config.EnvFileLoader;

@SpringBootApplication
@EnableFeignClients
public class JustificationServiceApplication {

    public static void main(String[] args) {
        EnvFileLoader.loadIfPresent();
        SpringApplication.run(JustificationServiceApplication.class, args);
    }

}
