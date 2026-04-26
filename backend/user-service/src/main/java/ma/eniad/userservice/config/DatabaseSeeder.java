package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;
import java.util.Set;

@Configuration
public class DatabaseSeeder {
    @Bean
    public CommandLineRunner seedDatabase(UserRepository userRepository) {
        return args -> {
            // Check if the database is already seeded to prevent duplicates
            if (userRepository.count() == 0) {
                // creating admin user
                List<User> users = List.of(
                        User.builder()
                                .email("ayoubelebbar@ump.ac.ma")
                                .firstName("Ayoub")
                                .lastName("Elebbar")
                                .roles(Set.of(Role.ADMIN))
                                .build(),

                        User.builder()
                                .email("mariamfahim@ump.ac.ma")
                                .firstName("Mariam")
                                .lastName("Fahim")
                                .roles(Set.of(Role.ADMIN))
                                .build(),

                        User.builder()
                                .email("abdelaliferhan@ump.ac.ma")
                                .firstName("Abdelali")
                                .lastName("Ferhan")
                                .roles(Set.of(Role.ADMIN))
                                .build(),

                        User.builder()
                                .email("abdelkodouselfadili@ump.ac.ma")
                                .firstName("Abdelkodous")
                                .lastName("Elfadili")
                                .roles(Set.of(Role.ADMIN))
                                .build()
                );

                userRepository.saveAll(users);

                System.out.println("Database seeded successfully!");
            } else {
                System.out.println("Database already seeded. Skipping...");
            }
        };
    }

}
