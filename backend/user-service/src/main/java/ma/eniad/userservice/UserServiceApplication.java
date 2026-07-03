package ma.eniad.userservice;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;

import ma.eniad.userservice.config.EnvFileLoader;

@SpringBootApplication
@EnableFeignClients
@EnableJpaAuditing
public class UserServiceApplication {

    public static void main(String[] args) {
        EnvFileLoader.loadIfPresent();
        SpringApplication.run(UserServiceApplication.class, args);
    }

}
