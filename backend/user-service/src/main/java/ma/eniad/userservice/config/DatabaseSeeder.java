package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.Admin;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.InscriptionRepository;
import ma.eniad.userservice.repository.structure.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


import java.util.List;
import java.util.Set;

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
            ModuleRepository moduleRepository,
            InscriptionRepository inscriptionRepository) {
        return args -> {
            // Check if the database is already seeded to prevent duplicates
            if (userRepository.count() == 0) {
                // creating admin users
                Admin admin1 = Admin.builder()
                        .email("ayoubelebbar@ump.ac.ma")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .roles(Set.of(Role.ADMIN))
                        .build();

                Admin admin2 = Admin.builder()
                        .email("mariamfahim@ump.ac.ma")
                        .firstName("Mariam")
                        .lastName("Fahim")
                        .roles(Set.of(Role.ADMIN))
                        .build();

                Admin admin3 = Admin.builder()
                        .email("abdelaliferhan@ump.ac.ma")
                        .firstName("Abdelali")
                        .lastName("Ferhan")
                        .roles(Set.of(Role.ADMIN))
                        .build();

                Admin admin4 = Admin.builder()
                        .email("abdelkodouselfadili@ump.ac.ma")
                        .firstName("Abdelkodous")
                        .lastName("Elfadili")
                        .roles(Set.of(Role.ADMIN))
                        .build();

                Teacher teacher1 = Teacher.builder()
                        .email("ayoubelebbar03@gmail.com")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .roles(Set.of(Role.TEACHER))
                        .build();

                Student student1 = Student.builder()
                        .email("ayoubelebbar15@gmail.com")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .numApogee("12345678")
                        .roles(Set.of(Role.STUDENT))
                        .build();

                Student student2 = Student.builder()
                        .email("student2@gmail.com")
                        .firstName("John")
                        .lastName("Doe")
                        .numApogee("87654321")
                        .roles(Set.of(Role.STUDENT))
                        .build();

                List<User> users = List.of(admin1, admin2, admin3, admin4, teacher1, student1, student2);

                userRepository.saveAll(users);

                System.out.println("Database users seeded successfully!");
            } else {
                System.out.println("Database users already seeded. Skipping...");
            }
        };
    }
}
