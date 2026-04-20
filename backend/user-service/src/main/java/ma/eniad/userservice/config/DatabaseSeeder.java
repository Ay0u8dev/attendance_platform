package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class DatabaseSeeder {
    @Bean
    public CommandLineRunner seedDatabase(UserRepository userRepository) {
        return args -> {
            // Check if the database is already seeded to prevent duplicates
            if (userRepository.count() == 0) {
                // creating admin user
                User user = User.builder()
                        .email("ayoubelebbar@ump.ac.ma")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .roles(List.of(Role.ADMIN))
                        .build();

                userRepository.save(user);

                System.out.println("Database seeded successfully!");
            } else {
                System.out.println("Database already seeded. Skipping...");
            }
        };
    }

}
