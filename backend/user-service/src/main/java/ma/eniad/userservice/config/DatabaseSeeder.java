package ma.eniad.userservice.config;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import ma.eniad.userservice.entity.Admin;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.enums.Role;
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
            SeedUsers seedUsers = seedUsers(userRepository);
            SeedStructure seedStructure = seedStructure(
                    anneeRepository,
                    cycleRepository,
                    filiereRepository,
                    formationRepository,
                    groupeRepository,
                    moduleRepository
            );
            seedInscriptions(inscriptionRepository, seedUsers, seedStructure);

            System.out.println("Database seed data is ready.");
        };
    }

private SeedUsers seedUsers(UserRepository userRepository) {
    Admin admin1 = ensureAdmin(
            userRepository,
            "ayoubelebbar@ump.ac.ma",
            "Ayoub",
            "Elebbar"
    );

    Teacher teacherAbdel = ensureTeacher(
            userRepository,
            "abdelkoddousselfadili@ump.ac.ma",
            "Abdelkoddouss",
            "Elfadili"
    );

    ensureAdmin(userRepository, "mariamfahim@ump.ac.ma", "Mariam", "Fahim");
    ensureAdmin(userRepository, "abdelaliferhan@ump.ac.ma", "Abdelali", "Ferhan");
    ensureAdmin(userRepository, "abdelkodouselfadili@ump.ac.ma", "Abdelkodous", "Elfadili");
    ensureTeacher(userRepository, "ayoubelebbar03@gmail.com", "Ayoub", "Elebbar");

    List<Student> students = new ArrayList<>(List.of(
            ensureStudent(userRepository, "sofiane.meziane@ump.ac.ma", "Sofiane", "Meziane", "250001"),
            ensureStudent(userRepository, "leila.bensalem@ump.ac.ma", "Leila", "Bensalem", "250002"),
            ensureStudent(userRepository, "yassine.elidrissi@ump.ac.ma", "Yassine", "El Idrissi", "250003"),
            ensureStudent(userRepository, "meryem.toumi@ump.ac.ma", "Meryem", "Toumi", "250004"),
            ensureStudent(userRepository, "bilal.aithamou@ump.ac.ma", "Bilal", "Ait Hamou", "250005"),
            ensureStudent(userRepository, "imane.kabbaj@ump.ac.ma", "Imane", "Kabbaj", "250006"),
            ensureStudent(userRepository, "nour.salmi@ump.ac.ma", "Nour Eddine", "Salmi", "250007"),
            ensureStudent(userRepository, "salma.alaoui@ump.ac.ma", "Salma", "Alaoui", "250008"),
            ensureStudent(userRepository, "hamza.rafik@ump.ac.ma", "Hamza", "Rafik", "250009"),
            ensureStudent(userRepository, "asmae.bennani@ump.ac.ma", "Asmae", "Bennani", "250010"),
            ensureStudent(userRepository, "karim.elmalki@ump.ac.ma", "Karim", "El Malki", "250011"),
            ensureStudent(userRepository, "hiba.ouazzani@ump.ac.ma", "Hiba", "Ouazzani", "250012"),
            ensureStudent(userRepository, "youssef.boulifa@ump.ac.ma", "Youssef", "Boulifa", "250013"),
            ensureStudent(userRepository, "sara.achraf@ump.ac.ma", "Sara", "Achraf", "250014"),
            ensureStudent(userRepository, "amine.rabaa@ump.ac.ma", "Amine", "Rabaa", "250015"),
            ensureStudent(userRepository, "nada.elhaj@ump.ac.ma", "Nada", "El Haj", "250016"),
            ensureStudent(userRepository, "anas.berrak@ump.ac.ma", "Anas", "Berrak", "250017"),
            ensureStudent(userRepository, "lina.haddou@ump.ac.ma", "Lina", "Haddou", "250018"),
            ensureStudent(userRepository, "ismail.khoury@ump.ac.ma", "Ismail", "Khoury", "250019"),
            ensureStudent(userRepository, "leila.kenza@ump.ac.ma", "Leila", "Kenza", "250020")
    ));
    
    // Ajouter le nouvel étudiant
    students.add(ensureStudent(userRepository, "abdoelfadili695@gmail.com", "elfadili", "abdo", "250021"));
    students.add(ensureStudent(userRepository, "ayoubelebbar15@gmail.com", "Elebbar", "Ayoub", "250022"));

    return new SeedUsers(admin1, teacherAbdel, students);
}


    private SeedStructure seedStructure(
            AnneeUniversitaireRepository anneeRepository,
            CycleRepository cycleRepository,
            FiliereRepository filiereRepository,
            FormationRepository formationRepository,
            GroupeRepository groupeRepository,
            ModuleRepository moduleRepository) {
        AnneeUniversitaire previousYear = ensureYear(
                anneeRepository,
                "2024-2025",
                LocalDate.of(2024, 9, 1),
                LocalDate.of(2025, 7, 31),
                false
        );
        AnneeUniversitaire activeYear = anneeRepository.findByActiveTrue().stream()
                .findFirst()
                .orElseGet(() -> ensureYear(
                        anneeRepository,
                        "2025-2026",
                        LocalDate.of(2025, 9, 1),
                        LocalDate.of(2026, 7, 31),
                        true
                ));

        Cycle prepa = ensureCycle(cycleRepository, "PREPA", "Classes Preparatoires", CycleType.PREPA);
        Cycle ingenieur = ensureCycle(cycleRepository, "ING", "Cycle Ingenieur", CycleType.INGENIEUR);

        Filiere gi = ensureFiliere(filiereRepository, "GI", "Genie Informatique");
        Filiere ids = ensureFiliere(filiereRepository, "IDS", "Ingenierie Data Science");
        Filiere cyber = ensureFiliere(filiereRepository, "CYBER", "Cybersecurite");

        Formation giFormation = ensureFormation(formationRepository, activeYear, gi, ingenieur);
        Formation idsFormation = ensureFormation(formationRepository, activeYear, ids, ingenieur);
        Formation cyberFormation = ensureFormation(formationRepository, activeYear, cyber, ingenieur);
        Formation prepaFormation = ensureFormation(formationRepository, activeYear, null, prepa);
        ensureFormation(formationRepository, previousYear, gi, ingenieur);

        Groupe gi1 = ensureGroup(groupeRepository, giFormation, "GI-1");
        Groupe gi2 = ensureGroup(groupeRepository, giFormation, "GI-2");
        Groupe ids1 = ensureGroup(groupeRepository, idsFormation, "IDS-1");
        Groupe ids2 = ensureGroup(groupeRepository, idsFormation, "IDS-2");
        Groupe cyber1 = ensureGroup(groupeRepository, cyberFormation, "CYBER-1");
        Groupe cyber2 = ensureGroup(groupeRepository, cyberFormation, "CYBER-2");
        Groupe prepa1 = ensureGroup(groupeRepository, prepaFormation, "PREPA-1");

        ensureModule(moduleRepository, giFormation, "WEB-401", "Advanced Web Development", 1, 48);
        ensureModule(moduleRepository, giFormation, "DB-301", "Database Architecture", 1, 42);
        ensureModule(moduleRepository, giFormation, "SEC-401", "Network Security", 2, 36);
        ensureModule(moduleRepository, giFormation, "SFT-402", "Software Engineering", 2, 40);
        ensureModule(moduleRepository, idsFormation, "AI-305", "Machine Learning Basics", 1, 44);
        ensureModule(moduleRepository, idsFormation, "STAT-301", "Applied Statistics", 1, 36);
        ensureModule(moduleRepository, idsFormation, "DM-302", "Data Mining", 2, 38);
        ensureModule(moduleRepository, cyberFormation, "CRY-402", "Applied Cryptography", 2, 40);
        ensureModule(moduleRepository, cyberFormation, "NET-401", "Network Defense", 1, 42);
        ensureModule(moduleRepository, prepaFormation, "ALG-201", "Advanced Algorithms", 1, 50);
        ensureModule(moduleRepository, prepaFormation, "PHY-202", "Physics for Engineers", 1, 46);

        return new SeedStructure(activeYear, List.of(gi1, gi2, ids1, ids2, cyber1, cyber2, prepa1));
    }

    private Admin ensureAdmin(UserRepository repository, String email, String firstName, String lastName) {
        return repository.findByEmail(email)
                .filter(Admin.class::isInstance)
                .map(Admin.class::cast)
                .orElseGet(() -> repository.save(Admin.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .roles(Set.of(Role.ADMIN))
                        .build()));
    }

    private Teacher ensureTeacher(UserRepository repository, String email, String firstName, String lastName) {
        return repository.findByEmail(email)
                .filter(Teacher.class::isInstance)
                .map(Teacher.class::cast)
                .orElseGet(() -> repository.save(Teacher.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .roles(Set.of(Role.TEACHER))
                        .build()));
    }

    private Student ensureStudent(UserRepository repository, String email, String firstName, String lastName, String numApogee) {
        return repository.findByEmail(email)
                .filter(Student.class::isInstance)
                .map(Student.class::cast)
                .orElseGet(() -> repository.save(Student.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .numApogee(numApogee)
                        .roles(Set.of(Role.STUDENT))
                        .build()));
    }

    private AnneeUniversitaire ensureYear(
            AnneeUniversitaireRepository repository,
            String name,
            LocalDate startDate,
            LocalDate endDate,
            boolean active) {
        return repository.findByName(name)
                .orElseGet(() -> repository.save(AnneeUniversitaire.builder()
                        .name(name)
                        .startDate(startDate)
                        .endDate(endDate)
                        .active(active)
                        .build()));
    }

    private Cycle ensureCycle(CycleRepository repository, String code, String name, CycleType type) {
        return repository.findByCode(code)
                .orElseGet(() -> repository.save(Cycle.builder()
                        .code(code)
                        .name(name)
                        .type(type)
                        .build()));
    }

    private Filiere ensureFiliere(FiliereRepository repository, String code, String name) {
        return repository.findByCode(code)
                .orElseGet(() -> repository.save(Filiere.builder()
                        .code(code)
                        .name(name)
                        .build()));
    }

    private Formation ensureFormation(
            FormationRepository repository,
            AnneeUniversitaire year,
            Filiere filiere,
            Cycle cycle) {
        Long filiereId = filiere != null ? filiere.getId() : null;
        return repository.findSeedFormation(year.getId(), filiereId, cycle.getId())
                .orElseGet(() -> repository.save(Formation.builder()
                        .anneeUniversitaire(year)
                        .filiere(filiere)
                        .cycle(cycle)
                        .build()));
    }

    private Groupe ensureGroup(GroupeRepository repository, Formation formation, String name) {
        return repository.findByFormationIdAndName(formation.getId(), name)
                .orElseGet(() -> repository.save(Groupe.builder()
                        .name(name)
                        .formation(formation)
                        .build()));
    }

    private Module ensureModule(
            ModuleRepository repository,
            Formation formation,
            String code,
            String name,
            Integer semester,
            Integer hours) {
        return repository.findByFormationIdAndCode(formation.getId(), code)
                .orElseGet(() -> repository.save(Module.builder()
                        .code(code)
                        .name(name)
                        .semester(semester)
                        .hours(hours)
                        .formation(formation)
                        .build()));
    }

    private void seedInscriptions(
        InscriptionRepository inscriptionRepository,
        SeedUsers seedUsers,
        SeedStructure seedStructure) {
    List<Groupe> groups = seedStructure.groups();
    List<Student> students = seedUsers.students();
    
    // Trouver le groupe GI-1
    Groupe gi1Group = groups.stream()
            .filter(g -> "GI-1".equals(g.getName()))
            .findFirst()
            .orElse(null);

    for (int i = 0; i < students.size(); i++) {
        Student student = students.get(i);
        Groupe group;
        
        // Mettre abdoelfadili695@gmail.com dans GI-1
        if ("abdoelfadili695@gmail.com".equals(student.getEmail()) || "ayoubelebbar15@gmail.com".equals(student.getEmail())) {
            group = gi1Group;
        } else {
            // Distribution cyclique pour les autres
            group = groups.get(i % groups.size());
        }
        
        if (group != null) {
            ensureInscription(inscriptionRepository, student, group, seedStructure.activeYear());
        }
    }
}

    private void ensureInscription(
            InscriptionRepository repository,
            Student student,
            Groupe group,
            AnneeUniversitaire year) {
        if (repository.existsByStudentIdAndGroupeIdAndAnneeUniversitaireId(
                student.getId(),
                group.getId(),
                year.getId())) {
            return;
        }

        Inscription inscription = new Inscription();
        inscription.setStudent(student);
        inscription.setGroupe(group);
        inscription.setAnneeUniversitaire(year);
        repository.save(inscription);
    }

    private record SeedUsers(Admin admin, Teacher teacher, List<Student> students) {
    }

    private record SeedStructure(AnneeUniversitaire activeYear, List<Groupe> groups) {
    }
}
