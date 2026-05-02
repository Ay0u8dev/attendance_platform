package ma.eniad.userservice.config;

import java.util.List;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

<<<<<<< Updated upstream
import java.util.List;
import java.util.Set;
=======
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
>>>>>>> Stashed changes

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

<<<<<<< Updated upstream
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
=======
                        User user2 = User.builder()
                        .email("abdelkoddousselfadili@ump.ac.ma")
                        .firstName("Abdelkoddouss")
                        .lastName("elfadili")
                        .roles(List.of(Role.ADMIN))
                        .build();

                userRepository.save(user);
                userRepository.save(user2);
>>>>>>> Stashed changes

                System.out.println("Database seeded successfully!");
            } else {
                System.out.println("Database already seeded. Skipping...");
            }
        };
    }

}
