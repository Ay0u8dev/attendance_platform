package ma.eniad.justificationservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;

@SpringBootApplication
@EnableFeignClients
public class JustificationServiceApplication {

    public static void main(String[] args) {
        SpringApplication.run(JustificationServiceApplication.class, args);
    }

}
