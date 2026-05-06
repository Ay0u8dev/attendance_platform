package ma.eniad.userservice.config;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DatabaseSeeder {
    @Bean
    public CommandLineRunner seedDatabase(
            UserRepository userRepository,
            AnneeUniversitaireRepository anneeRepository,
            CycleRepository cycleRepository,
            FiliereRepository filiereRepository,
            FormationRepository formationRepository,
            GroupeRepository groupeRepository,
            ModuleRepository moduleRepository) {
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
                                .build());

                userRepository.saveAll(users);

                System.out.println("Database seeded successfully!");
            } else {
                System.out.println("Database already seeded. Skipping...");
            }
        };
    }

}
