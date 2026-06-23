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
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.structure.*;
import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.transaction.support.TransactionTemplate;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

@Configuration
@ConditionalOnProperty(name = "app.database-seeding.enabled", havingValue = "true", matchIfMissing = true)
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
            StudentInscriptionRepository inscriptionRepository,
            StudentRepository studentRepository,
            TransactionTemplate transactionTemplate) {
        return args -> transactionTemplate.executeWithoutResult(status -> {
            SeedUsers seedUsers = seedUsers(userRepository, studentRepository);
            SeedStructure seedStructure = seedStructure(
                    anneeRepository,
                    cycleRepository,
                    filiereRepository,
                    formationRepository,
                    groupeRepository,
                    moduleRepository
            );
            seedInscriptions(inscriptionRepository, seedUsers, seedStructure);
        });
    }

    private SeedUsers seedUsers(UserRepository userRepository, StudentRepository studentRepository) {
        ensureAdmin(
                userRepository,
                "ayoubelebbar@ump.ac.ma",
                "Ayoub",
                "Elebbar"
        );

        ensureTeacher(
                userRepository,
                "abdelkoddousselfadili@ump.ac.ma",
                "Abdelkoddouss",
                "Elfadili"
        );

        ensureAdmin(userRepository, "mariamfahim@ump.ac.ma", "Mariam", "Fahim");
        ensureAdmin(userRepository, "abdelaliferhan@ump.ac.ma", "Abdelali", "Ferhan");
        ensureAdmin(userRepository, "abdelkodouselfadili@ump.ac.ma", "Abdelkodous", "Elfadili");
        ensureTeacher(userRepository, "ayoubelebbar03@ump.ac.ma", "Ayoub", "Elebbar");

        List<Student> students = new ArrayList<>(List.of(
                ensureStudent(userRepository, studentRepository, "sofiane.meziane@ump.ac.ma", "Sofiane", "Meziane", "250001"),
                ensureStudent(userRepository, studentRepository, "leila.bensalem@ump.ac.ma", "Leila", "Bensalem", "250002"),
                ensureStudent(userRepository, studentRepository, "yassine.elidrissi@ump.ac.ma", "Yassine", "El Idrissi", "250003"),
                ensureStudent(userRepository, studentRepository, "meryem.toumi@ump.ac.ma", "Meryem", "Toumi", "250004"),
                ensureStudent(userRepository, studentRepository, "bilal.aithamou@ump.ac.ma", "Bilal", "Ait Hamou", "250005"),
                ensureStudent(userRepository, studentRepository, "imane.kabbaj@ump.ac.ma", "Imane", "Kabbaj", "250006"),
                ensureStudent(userRepository, studentRepository, "nour.salmi@ump.ac.ma", "Nour Eddine", "Salmi", "250007"),
                ensureStudent(userRepository, studentRepository, "salma.alaoui@ump.ac.ma", "Salma", "Alaoui", "250008"),
                ensureStudent(userRepository, studentRepository, "hamza.rafik@ump.ac.ma", "Hamza", "Rafik", "250009"),
                ensureStudent(userRepository, studentRepository, "asmae.bennani@ump.ac.ma", "Asmae", "Bennani", "250010"),
                ensureStudent(userRepository, studentRepository, "karim.elmalki@ump.ac.ma", "Karim", "El Malki", "250011"),
                ensureStudent(userRepository, studentRepository, "hiba.ouazzani@ump.ac.ma", "Hiba", "Ouazzani", "250012"),
                ensureStudent(userRepository, studentRepository, "youssef.boulifa@ump.ac.ma", "Youssef", "Boulifa", "250013"),
                ensureStudent(userRepository, studentRepository, "sara.achraf@ump.ac.ma", "Sara", "Achraf", "250014"),
                ensureStudent(userRepository, studentRepository, "amine.rabaa@ump.ac.ma", "Amine", "Rabaa", "250015"),
                ensureStudent(userRepository, studentRepository, "nada.elhaj@ump.ac.ma", "Nada", "El Haj", "250016"),
                ensureStudent(userRepository, studentRepository, "anas.berrak@ump.ac.ma", "Anas", "Berrak", "250017"),
                ensureStudent(userRepository, studentRepository, "lina.haddou@ump.ac.ma", "Lina", "Haddou", "250018"),
                ensureStudent(userRepository, studentRepository, "ismail.khoury@ump.ac.ma", "Ismail", "Khoury", "250019"),
                ensureStudent(userRepository, studentRepository, "leila.kenza@ump.ac.ma", "Leila", "Kenza", "250020")
        ));

        // Add students used for GI-1 test/demo data.
        students.add(ensureStudent(userRepository, studentRepository, "abdo.elfadili@ump.ac.ma", "Abdo", "El Fadili", "250021"));
        students.add(ensureStudent(userRepository, studentRepository, "ayoub.elebbar15@ump.ac.ma", "Ayoub", "Elebbar", "250022"));

        return new SeedUsers(students);
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

    private void ensureAdmin(UserRepository repository, String email, String firstName, String lastName) {
        findSeedUserByEmail(repository, email)
                .ifPresentOrElse(
                        user -> updateSeedUser(repository, user, email, firstName, lastName, Role.ADMIN),
                        () -> repository.save(Admin.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .roles(Set.of(Role.ADMIN))
                        .build())
                );
    }

    private void ensureTeacher(UserRepository repository, String email, String firstName, String lastName) {
        findSeedUserByEmail(repository, email)
                .ifPresentOrElse(
                        user -> updateSeedUser(repository, user, email, firstName, lastName, Role.TEACHER),
                        () -> repository.save(Teacher.builder()
                        .email(email)
                        .firstName(firstName)
                        .lastName(lastName)
                        .roles(Set.of(Role.TEACHER))
                        .build())
                );
    }

    private Optional<User> findSeedUserByEmail(UserRepository repository, String email) {
        return repository.findByNormalizedEmailIn(Set.of(email.toLowerCase(Locale.ROOT)))
                .stream()
                .findFirst();
    }

    private User updateSeedUser(
            UserRepository repository,
            User user,
            String email,
            String firstName,
            String lastName,
            Role role) {
        boolean changed = false;
        if (!email.equalsIgnoreCase(user.getEmail())) {
            user.setEmail(email);
            changed = true;
        }
        if (user.getFirstName() == null || user.getFirstName().isBlank()) {
            user.setFirstName(firstName);
            changed = true;
        }
        if (user.getLastName() == null || user.getLastName().isBlank()) {
            user.setLastName(lastName);
            changed = true;
        }
        if (user.getRoles() == null) {
            user.setRoles(new HashSet<>());
            changed = true;
        }
        if (!user.getRoles().contains(role)) {
            user.getRoles().add(role);
            changed = true;
        }
        return changed ? repository.save(user) : user;
    }

    private Student ensureStudent(
            UserRepository userRepository,
            StudentRepository studentRepository,
            String email,
            String firstName,
            String lastName,
            String numApogee) {
        return findSeedUserByEmail(userRepository, email)
                .map(existingUser -> {
                    if (existingUser instanceof Student) {
                        Student student = (Student) existingUser;
                        return updateSeedStudent(studentRepository, student, email, firstName, lastName, numApogee);
                    }
                    throw new IllegalStateException("Seed email already belongs to a non-student: " + email);
                })
                .orElseGet(() -> studentRepository.findByNumApogee(numApogee)
                        .map(student -> updateSeedStudent(studentRepository, student, email, firstName, lastName, numApogee))
                        .orElseGet(() -> studentRepository.save(Student.builder()
                                .email(email)
                                .firstName(firstName)
                                .lastName(lastName)
                                .numApogee(numApogee)
                                .roles(Set.of(Role.STUDENT))
                                .build())));
    }

    private Student updateSeedStudent(
            StudentRepository repository,
            Student student,
            String email,
            String firstName,
            String lastName,
            String numApogee) {
        boolean changed = false;
        if (!email.equalsIgnoreCase(student.getEmail())) {
            student.setEmail(email);
            changed = true;
        }
        if (student.getFirstName() == null || student.getFirstName().isBlank()) {
            student.setFirstName(firstName);
            changed = true;
        }
        if (student.getLastName() == null || student.getLastName().isBlank()) {
            student.setLastName(lastName);
            changed = true;
        }
        if (student.getNumApogee() == null || student.getNumApogee().isBlank()) {
            student.setNumApogee(numApogee);
            changed = true;
        }
        if (student.getRoles() == null) {
            student.setRoles(new HashSet<>());
            changed = true;
        }
        if (!student.getRoles().contains(Role.STUDENT)) {
            student.getRoles().add(Role.STUDENT);
            changed = true;
        }
        return changed ? repository.save(student) : student;
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
        String name = filiere != null ? filiere.getCode() : cycle.getCode();
        return repository.findSeedFormation(year.getId(), filiereId, cycle.getId())
                .orElseGet(() -> repository.save(Formation.builder()
                        .name(name)
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
            StudentInscriptionRepository inscriptionRepository,
            SeedUsers seedUsers,
            SeedStructure seedStructure) {
        List<Groupe> groups = seedStructure.groups();
        List<Student> students = seedUsers.students();

        // Find the GI-1 group for the dedicated demo students.
        Groupe gi1Group = groups.stream()
                .filter(g -> "GI-1".equals(g.getName()))
                .findFirst()
                .orElse(null);

        for (int i = 0; i < students.size(); i++) {
            Student student = students.get(i);
            Groupe group;

            if ("abdo.elfadili@ump.ac.ma".equals(student.getEmail())
                    || "ayoub.elebbar15@ump.ac.ma".equals(student.getEmail())) {
                group = gi1Group;
            } else {
                group = groups.get(i % groups.size());
            }

            if (group != null) {
                ensureInscription(inscriptionRepository, student, group, seedStructure.activeYear());
            }
        }
    }

    private void ensureInscription(
            StudentInscriptionRepository repository,
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
        inscription.setFormation(group.getFormation());
        inscription.setAnneeUniversitaire(year);
        repository.save(inscription);
    }

    private static final class SeedUsers {
        private final List<Student> students;

        private SeedUsers(List<Student> students) {
            this.students = students;
        }

        private List<Student> students() {
            return students;
        }
    }

    private static final class SeedStructure {
        private final AnneeUniversitaire activeYear;
        private final List<Groupe> groups;

        private SeedStructure(AnneeUniversitaire activeYear, List<Groupe> groups) {
            this.activeYear = activeYear;
            this.groups = groups;
        }

        private AnneeUniversitaire activeYear() {
            return activeYear;
        }

        private List<Groupe> groups() {
            return groups;
        }
    }
}
