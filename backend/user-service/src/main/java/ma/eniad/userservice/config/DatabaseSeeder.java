package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.Admin;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
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

                AnneeUniversitaire annee = AnneeUniversitaire.builder()
                        .name("2023-2024")
                        .startDate(LocalDate.of(2023, 9, 1))
                        .endDate(LocalDate.of(2024, 6, 30))
                        .active(true)
                        .build();
                anneeRepository.save(annee);

                Cycle cycle = Cycle.builder()
                        .code("ING")
                        .name("Cycle Ingenieur")
                        .type(CycleType.INGENIEUR)
                        .build();
                cycleRepository.save(cycle);

                Filiere filiere = Filiere.builder()
                        .code("GI")
                        .name("Genie Informatique")
                        .build();
                filiereRepository.save(filiere);

                Formation formation = Formation.builder()
                        .anneeUniversitaire(annee)
                        .cycle(cycle)
                        .filiere(filiere)
                        .build();
                formationRepository.save(formation);

                Groupe groupe = Groupe.builder()
                        .name("GI-1A")
                        .formation(formation)
                        .build();
                groupeRepository.save(groupe);

                Module module = Module.builder()
                        .code("ALGO1")
                        .name("Algorithmique 1")
                        .semester(1)
                        .hours(42)
                        .formation(formation)
                        .build();
                moduleRepository.save(module);

                Student seededStudent = userRepository.findByEmail("ayoubelebbar15@gmail.com")
                        .filter(Student.class::isInstance)
                        .map(Student.class::cast)
                        .orElse(student1);

                Inscription inscription = new Inscription();
                inscription.setStudent(seededStudent);
                inscription.setGroupe(groupe);
                inscription.setAnneeUniversitaire(annee);
                inscriptionRepository.save(inscription);

                System.out.println("Database users seeded successfully!");
            } else {
                System.out.println("Database users already seeded. Skipping...");
            }
        };
    }
}
