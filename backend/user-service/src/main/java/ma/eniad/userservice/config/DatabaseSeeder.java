package ma.eniad.userservice.config;

import ma.eniad.userservice.entity.Admin;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
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
import ma.eniad.userservice.repository.inscription.TeacherAssignmentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Set;

@Configuration
@Profile("dev")
public class DatabaseSeeder {

    private static final String ACADEMIC_YEAR_NAME = "2025-2026";
    private static final String CYCLE_CODE = "ING";
    private static final String FILIERE_CODE = "GI";
    private static final String FORMATION_NAME = "GI-1A";
    private static final String GROUPE_1_NAME = "GI-1A-G1";
    private static final String GROUPE_2_NAME = "GI-1A-G2";
    private static final String GROUPE_3_NAME = "GI-1A-G3";
    private static final String MODULE_CODE = "ALGO1";

    @Bean
    public CommandLineRunner seedDatabase(
            UserRepository userRepository,
            StudentRepository studentRepository,
            TeacherRepository teacherRepository,
            AnneeUniversitaireRepository anneeRepository,
            CycleRepository cycleRepository,
            FiliereRepository filiereRepository,
            FormationRepository formationRepository,
            GroupeRepository groupeRepository,
            ModuleRepository moduleRepository,
            StudentInscriptionRepository inscriptionRepository,
            TeacherAssignmentRepository assignmentRepository) {
        return args -> {
            ensureUsers(userRepository, studentRepository, teacherRepository);

            AnneeUniversitaire annee = ensureAcademicYear(anneeRepository);
            Cycle cycle = ensureCycle(cycleRepository);
            Filiere filiere = ensureFiliere(filiereRepository);
            Formation formation = ensureFormation(formationRepository, annee, cycle, filiere);
            List<Groupe> groupes = ensureGroups(groupeRepository, formation);
            List<Module> modules = ensureModules(moduleRepository, formation);
            ensureInscriptions(studentRepository, inscriptionRepository, annee, formation, groupes);
            ensureTeacherAssignments(teacherRepository, assignmentRepository, annee, formation, groupes, modules);

            System.out.println("Database seed checked successfully.");
        };
    }

    private void ensureUsers(UserRepository userRepository,
                             StudentRepository studentRepository,
                             TeacherRepository teacherRepository) {
        List<User> usersToCreate = new ArrayList<>();

        ensureUser(usersToCreate, userRepository, Admin.builder()
                .email("ayoubelebbar@ump.ac.ma")
                .firstName("Ayoub")
                .lastName("Elebbar")
                .roles(Set.of(Role.ADMIN))
                .build(), Role.ADMIN);
        ensureUser(usersToCreate, userRepository, Admin.builder()
                .email("mariamfahim@ump.ac.ma")
                .firstName("Mariam")
                .lastName("Fahim")
                .roles(Set.of(Role.ADMIN))
                .build(), Role.ADMIN);
        ensureUser(usersToCreate, userRepository, Admin.builder()
                .email("abdelaliferhan@ump.ac.ma")
                .firstName("Abdelali")
                .lastName("Ferhan")
                .roles(Set.of(Role.ADMIN))
                .build(), Role.ADMIN);
        ensureUser(usersToCreate, userRepository, Admin.builder()
                .email("abdelkodouselfadili@ump.ac.ma")
                .firstName("Abdelkodous")
                .lastName("Elfadili")
                .roles(Set.of(Role.ADMIN))
                .build(), Role.ADMIN);

        for (Teacher teacher : seedTeachers()) {
            if (teacherRepository.findByEmailIgnoreCase(teacher.getEmail()).isPresent()) {
                ensureExistingRole(userRepository, teacher.getEmail(), Role.TEACHER);
            } else if ("teacher.ayoub@ump.ac.ma".equals(teacher.getEmail())
                    && teacherRepository.findByEmailIgnoreCase("ayoubelebbar03@gmail.com").isPresent()) {
                updateExistingEmail(userRepository, "ayoubelebbar03@gmail.com", teacher.getEmail(), Role.TEACHER);
            } else if (!userRepository.existsByEmail(teacher.getEmail())) {
                usersToCreate.add(teacher);
            }
        }

        for (Student student : seedStudents()) {
            var existingStudent = studentRepository.findByNumApogee(student.getNumApogee());
            if (existingStudent.isPresent()) {
                updateExistingEmail(userRepository, existingStudent.get().getEmail(), student.getEmail(), Role.STUDENT);
            } else if (!userRepository.existsByEmail(student.getEmail())) {
                usersToCreate.add(student);
            }
        }

        if (!usersToCreate.isEmpty()) {
            userRepository.saveAll(usersToCreate);
        }
    }

    private void ensureUser(List<User> usersToCreate, UserRepository userRepository, User user, Role role) {
        if (userRepository.existsByEmail(user.getEmail())) {
            ensureExistingRole(userRepository, user.getEmail(), role);
            return;
        }

        usersToCreate.add(user);
    }

    private void ensureExistingRole(UserRepository userRepository, String email, Role role) {
        userRepository.findByEmail(email).ifPresent(user -> {
            if (!user.getRoles().contains(role)) {
                user.getRoles().add(role);
                userRepository.save(user);
            }
        });
    }

    private void updateExistingEmail(UserRepository userRepository, String currentEmail, String targetEmail, Role role) {
        userRepository.findByEmail(currentEmail).ifPresent(user -> {
            if (!currentEmail.equalsIgnoreCase(targetEmail) && !userRepository.existsByEmail(targetEmail)) {
                user.setEmail(targetEmail);
            }
            if (!user.getRoles().contains(role)) {
                user.getRoles().add(role);
            }
            userRepository.save(user);
        });
    }

    private List<Student> seedStudents() {
        return List.of(
                Student.builder()
                        .email("ayoubelebbar15@ump.ac.ma")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .numApogee("24000001")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g1.02@ump.ac.ma")
                        .firstName("Yassine")
                        .lastName("Bennani")
                        .numApogee("24000002")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g1.03@ump.ac.ma")
                        .firstName("Salma")
                        .lastName("Naciri")
                        .numApogee("24000003")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g1.04@ump.ac.ma")
                        .firstName("Omar")
                        .lastName("Ait Lahcen")
                        .numApogee("24000004")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g1.05@ump.ac.ma")
                        .firstName("Imane")
                        .lastName("El Amrani")
                        .numApogee("24000005")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g2.01@ump.ac.ma")
                        .firstName("Mehdi")
                        .lastName("Tazi")
                        .numApogee("24000006")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g2.02@ump.ac.ma")
                        .firstName("Noura")
                        .lastName("Fassi")
                        .numApogee("24000007")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g2.03@ump.ac.ma")
                        .firstName("Hamza")
                        .lastName("Raji")
                        .numApogee("24000008")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g2.04@ump.ac.ma")
                        .firstName("Aya")
                        .lastName("Mansouri")
                        .numApogee("24000009")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g2.05@ump.ac.ma")
                        .firstName("Anas")
                        .lastName("Berrada")
                        .numApogee("24000010")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.01@ump.ac.ma")
                        .firstName("Lina")
                        .lastName("El Idrissi")
                        .numApogee("24000011")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.02@ump.ac.ma")
                        .firstName("Adam")
                        .lastName("Rachidi")
                        .numApogee("24000012")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.03@ump.ac.ma")
                        .firstName("Meryem")
                        .lastName("Ouahbi")
                        .numApogee("24000013")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.04@ump.ac.ma")
                        .firstName("Ilyas")
                        .lastName("Ziani")
                        .numApogee("24000014")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.05@ump.ac.ma")
                        .firstName("Hajar")
                        .lastName("Nouri")
                        .numApogee("24000015")
                        .roles(Set.of(Role.STUDENT))
                        .build(),
                Student.builder()
                        .email("student.g3.06@ump.ac.ma")
                        .firstName("Youssef")
                        .lastName("Kabbaj")
                        .numApogee("24000016")
                        .roles(Set.of(Role.STUDENT))
                        .build()
        );
    }

    private List<Teacher> seedTeachers() {
        return List.of(
                Teacher.builder()
                        .email("teacher.ayoub@ump.ac.ma")
                        .firstName("Ayoub")
                        .lastName("Elebbar")
                        .roles(Set.of(Role.TEACHER))
                        .build(),
                Teacher.builder()
                        .email("teacher.nadia@ump.ac.ma")
                        .firstName("Nadia")
                        .lastName("El Amrani")
                        .roles(Set.of(Role.TEACHER))
                        .build(),
                Teacher.builder()
                        .email("teacher.youssef@ump.ac.ma")
                        .firstName("Youssef")
                        .lastName("Bennani")
                        .roles(Set.of(Role.TEACHER))
                        .build()
        );
    }

    private AnneeUniversitaire ensureAcademicYear(AnneeUniversitaireRepository anneeRepository) {
        return anneeRepository.findByNameIn(Set.of(ACADEMIC_YEAR_NAME)).stream()
                .findFirst()
                .orElseGet(() -> anneeRepository.save(AnneeUniversitaire.builder()
                        .name(ACADEMIC_YEAR_NAME)
                        .startDate(LocalDate.of(2025, 9, 1))
                        .endDate(LocalDate.of(2026, 6, 30))
                        .active(true)
                        .build()));
    }

    private Cycle ensureCycle(CycleRepository cycleRepository) {
        return cycleRepository.findAll().stream()
                .filter(cycle -> CYCLE_CODE.equals(cycle.getCode()))
                .findFirst()
                .orElseGet(() -> cycleRepository.save(Cycle.builder()
                        .code(CYCLE_CODE)
                        .name("Cycle Ingenieur")
                        .type(CycleType.INGENIEUR)
                        .build()));
    }

    private Filiere ensureFiliere(FiliereRepository filiereRepository) {
        return filiereRepository.findAll().stream()
                .filter(filiere -> FILIERE_CODE.equals(filiere.getCode()))
                .findFirst()
                .orElseGet(() -> filiereRepository.save(Filiere.builder()
                        .code(FILIERE_CODE)
                        .name("Genie Informatique")
                        .build()));
    }

    private Formation ensureFormation(FormationRepository formationRepository,
                                      AnneeUniversitaire annee,
                                      Cycle cycle,
                                      Filiere filiere) {
        return formationRepository.findByNameIn(Set.of(FORMATION_NAME)).stream()
                .filter(formation -> formation.getAnneeUniversitaire().getId().equals(annee.getId()))
                .findFirst()
                .orElseGet(() -> formationRepository.save(Formation.builder()
                        .name(FORMATION_NAME)
                        .anneeUniversitaire(annee)
                        .cycle(cycle)
                        .filiere(filiere)
                        .build()));
    }

    private List<Groupe> ensureGroups(GroupeRepository groupeRepository, Formation formation) {
        List<Groupe> existingGroups = groupeRepository.findByNameIn(Set.of(GROUPE_1_NAME, GROUPE_2_NAME, GROUPE_3_NAME));
        Groupe groupe1 = existingGroups.stream()
                .filter(group -> GROUPE_1_NAME.equals(group.getName()))
                .findFirst()
                .orElseGet(() -> groupeRepository.save(Groupe.builder()
                        .name(GROUPE_1_NAME)
                        .formation(formation)
                        .build()));
        Groupe groupe2 = existingGroups.stream()
                .filter(group -> GROUPE_2_NAME.equals(group.getName()))
                .findFirst()
                .orElseGet(() -> groupeRepository.save(Groupe.builder()
                        .name(GROUPE_2_NAME)
                        .formation(formation)
                        .build()));
        Groupe groupe3 = existingGroups.stream()
                .filter(group -> GROUPE_3_NAME.equals(group.getName()))
                .findFirst()
                .orElseGet(() -> groupeRepository.save(Groupe.builder()
                        .name(GROUPE_3_NAME)
                        .formation(formation)
                        .build()));
        return List.of(groupe1, groupe2, groupe3);
    }

    private List<Module> ensureModules(ModuleRepository moduleRepository, Formation formation) {
        return List.of(
                ensureModule(moduleRepository, formation, MODULE_CODE, "Algorithmique 1", 1, 42),
                ensureModule(moduleRepository, formation, "BD1", "Bases de donnees", 1, 40),
                ensureModule(moduleRepository, formation, "RES1", "Reseaux", 2, 36),
                ensureModule(moduleRepository, formation, "JAVA1", "Programmation Java", 2, 44)
        );
    }

    private Module ensureModule(ModuleRepository moduleRepository,
                                Formation formation,
                                String code,
                                String name,
                                int semester,
                                int hours) {
        return moduleRepository.findByCodeIn(Set.of(code)).stream()
                .filter(module -> module.getFormation().getId().equals(formation.getId()))
                .findFirst()
                .orElseGet(() -> moduleRepository.save(Module.builder()
                        .code(code)
                        .name(name)
                        .semester(semester)
                        .hours(hours)
                        .formation(formation)
                        .build()));
    }

    private void ensureInscriptions(StudentRepository studentRepository,
                                    StudentInscriptionRepository inscriptionRepository,
                                    AnneeUniversitaire annee,
                                    Formation formation,
                                    List<Groupe> groupes) {
        List<Student> students = studentRepository.findByNumApogeeIn(Set.of(
                        "24000001",
                        "24000002",
                        "24000003",
                        "24000004",
                        "24000005",
                        "24000006",
                        "24000007",
                        "24000008",
                        "24000009",
                        "24000010",
                        "24000011",
                        "24000012",
                        "24000013",
                        "24000014",
                        "24000015",
                        "24000016"
                )).stream()
                .sorted(Comparator.comparing(Student::getNumApogee))
                .toList();

        List<Inscription> inscriptions = new ArrayList<>();
        for (int index = 0; index < students.size(); index++) {
            Student student = students.get(index);
            if (inscriptionRepository.existsByStudentIdAndAnneeUniversitaireId(student.getId(), annee.getId())) {
                continue;
            }

            Inscription inscription = new Inscription();
            inscription.setStudent(student);
            inscription.setGroupe(index < 5 ? groupes.get(0) : index < 10 ? groupes.get(1) : groupes.get(2));
            inscription.setFormation(formation);
            inscription.setAnneeUniversitaire(annee);
            inscriptions.add(inscription);
        }

        if (!inscriptions.isEmpty()) {
            inscriptionRepository.saveAll(inscriptions);
        }
    }

    private void ensureTeacherAssignments(TeacherRepository teacherRepository,
                                          TeacherAssignmentRepository assignmentRepository,
                                          AnneeUniversitaire annee,
                                          Formation formation,
                                          List<Groupe> groupes,
                                          List<Module> modules) {
        List<TeacherAssignment> assignments = new ArrayList<>();
        List<Teacher> teachers = teacherRepository.findAll().stream()
                .filter(teacher -> teacher.getEmail().startsWith("teacher."))
                .sorted(Comparator.comparing(Teacher::getEmail))
                .toList();
        if (teachers.isEmpty() || modules.isEmpty()) {
            return;
        }

        for (int index = 0; index < teachers.size(); index++) {
            Teacher teacher = teachers.get(index);
            Groupe groupe = groupes.get(index % groupes.size());
            Module module = modules.get(index % modules.size());

            if (assignmentRepository.existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleId(
                    teacher.getId(), annee.getId(), formation.getId(), groupe.getId(), module.getId())) {
                continue;
            }

            TeacherAssignment assignment = new TeacherAssignment();
            assignment.setTeacher(teacher);
            assignment.setAcademicYear(annee);
            assignment.setFormation(formation);
            assignment.setGroupe(groupe);
            assignment.setModule(module);
            assignments.add(assignment);
        }

        if (!assignments.isEmpty()) {
            assignmentRepository.saveAll(assignments);
        }
    }
}
