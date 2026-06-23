package ma.eniad.attendanceservice.config;

import ma.eniad.attendanceservice.service.AdminJustificationService;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.core.annotation.Order;

@Configuration
public class JustificationSeeder {

    @Bean
    @Order(2)
    public CommandLineRunner seedJustifications(AdminJustificationService adminJustificationService) {
        return args -> adminJustificationService.seedFromAbsentRecordsIfEmpty();
    }
}
