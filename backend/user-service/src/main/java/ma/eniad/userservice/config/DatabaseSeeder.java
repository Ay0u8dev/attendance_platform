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

import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.structure.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;


import java.time.LocalDate;
import java.util.ArrayList;
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
            StudentInscriptionRepository inscriptionRepository) {
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

                List<Student> students = List.of(
                        Student.builder()
                                .email("ayoubelebbar15@gmail.com")
                                .firstName("Ayoub")
                                .lastName("Elebbar")
                                .numApogee("24000001")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g1.02@gmail.com")
                                .firstName("Yassine")
                                .lastName("Bennani")
                                .numApogee("24000002")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g1.03@gmail.com")
                                .firstName("Salma")
                                .lastName("Naciri")
                                .numApogee("24000003")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g1.04@gmail.com")
                                .firstName("Omar")
                                .lastName("Ait Lahcen")
                                .numApogee("24000004")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g1.05@gmail.com")
                                .firstName("Imane")
                                .lastName("El Amrani")
                                .numApogee("24000005")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g2.01@gmail.com")
                                .firstName("Mehdi")
                                .lastName("Tazi")
                                .numApogee("24000006")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g2.02@gmail.com")
                                .firstName("Noura")
                                .lastName("Fassi")
                                .numApogee("24000007")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g2.03@gmail.com")
                                .firstName("Hamza")
                                .lastName("Raji")
                                .numApogee("24000008")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g2.04@gmail.com")
                                .firstName("Aya")
                                .lastName("Mansouri")
                                .numApogee("24000009")
                                .roles(Set.of(Role.STUDENT))
                                .build(),
                        Student.builder()
                                .email("student.g2.05@gmail.com")
                                .firstName("Anas")
                                .lastName("Berrada")
                                .numApogee("24000010")
                                .roles(Set.of(Role.STUDENT))
                                .build()
                );

                List<User> users = new ArrayList<>();
                users.addAll(List.of(admin1, admin2, admin3, admin4, teacher1));
                users.addAll(students);

                userRepository.saveAll(users);

                AnneeUniversitaire annee = AnneeUniversitaire.builder()
                        .name("2025-2026")
                        .startDate(LocalDate.of(2025, 9, 1))
                        .endDate(LocalDate.of(2026, 6, 30))
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
                        .name("GI-1A")
                        .anneeUniversitaire(annee)
                        .cycle(cycle)
                        .filiere(filiere)
                        .build();
                formationRepository.save(formation);

                Groupe groupe1 = Groupe.builder()
                        .name("GI-1A-G1")
                        .formation(formation)
                        .build();
                Groupe groupe2 = Groupe.builder()
                        .name("GI-1A-G2")
                        .formation(formation)
                        .build();
                groupeRepository.saveAll(List.of(groupe1, groupe2));

                Module module = Module.builder()
                        .code("ALGO1")
                        .name("Algorithmique 1")
                        .semester(1)
                        .hours(42)
                        .formation(formation)
                        .build();
                moduleRepository.save(module);

                List<Inscription> inscriptions = new ArrayList<>();
                for (int index = 0; index < students.size(); index++) {
                    Inscription inscription = new Inscription();
                    inscription.setStudent(students.get(index));
                    inscription.setGroupe(index < 5 ? groupe1 : groupe2);
                    inscription.setFormation(formation);
                    inscription.setAnneeUniversitaire(annee);
                    inscriptions.add(inscription);
                }
                inscriptionRepository.saveAll(inscriptions);

                System.out.println("Database users seeded successfully!");
            } else {
                System.out.println("Database users already seeded. Skipping...");
            }
        };
    }
}
