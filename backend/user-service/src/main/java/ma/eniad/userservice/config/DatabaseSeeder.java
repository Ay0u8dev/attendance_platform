package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.Admin;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.*;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.structure.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.LocalDate;
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

            if (anneeRepository.count() == 0
                    && cycleRepository.count() == 0
                    && filiereRepository.count() == 0
                    && formationRepository.count() == 0
                    && groupeRepository.count() == 0
                    && moduleRepository.count() == 0) {
                AnneeUniversitaire annee = AnneeUniversitaire.builder()
                        .name("2024-2025")
                        .startDate(LocalDate.of(2024, 9, 1))
                        .endDate(LocalDate.of(2025, 6, 30))
                        .active(true)
                        .build();
                annee = anneeRepository.save(annee);

                Cycle cycle = Cycle.builder()
                        .code("ING")
                        .name("Ingenieur")
                        .type(CycleType.INGENIEUR)
                        .build();
                cycle = cycleRepository.save(cycle);

                Filiere filiere = Filiere.builder()
                        .code("GI")
                        .name("Genie Informatique")
                        .build();
                filiere = filiereRepository.save(filiere);

                Formation formation = Formation.builder()
                        .anneeUniversitaire(annee)
                        .cycle(cycle)
                        .filiere(filiere)
                        .build();
                formation = formationRepository.save(formation);

                Groupe groupe = Groupe.builder()
                        .name("G1")
                        .formation(formation)
                        .build();
                groupe = groupeRepository.save(groupe);

                Module module = Module.builder()
                        .name("Programmation Java")
                        .code("JAVA101")
                        .semester(1)
                        .hours(48)
                        .formation(formation)
                        .build();
                moduleRepository.save(module);

                System.out.println("Structure entities seeded successfully!");

                // Seed Inscriptions if we just created students and structure
                if (inscriptionRepository.count() == 0) {
                    User student1User = userRepository.findByEmail("ayoubelebbar15@gmail.com").orElse(null);
                    User student2User = userRepository.findByEmail("student2@gmail.com").orElse(null);

                    if (student1User instanceof Student s1 && student2User instanceof Student s2) {
                        Inscription inscription1 = new Inscription();
                        inscription1.setStudent(s1);
                        inscription1.setGroupe(groupe);
                        inscription1.setAnneeUniversitaire(annee);

                        Inscription inscription2 = new Inscription();
                        inscription2.setStudent(s2);
                        inscription2.setGroupe(groupe);
                        inscription2.setAnneeUniversitaire(annee);

                        inscriptionRepository.saveAll(List.of(inscription1, inscription2));
                        System.out.println("Inscriptions seeded successfully!");
                    }
                }
            } else {
                System.out.println("Structure entities already seeded. Skipping...");
            }
        };
    }
}
