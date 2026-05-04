package ma.eniad.userservice.controller;

import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Set;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class UserControllerRosterIntegrationTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private GroupeRepository groupeRepository;

    @Autowired
    private AnneeUniversitaireRepository anneeUniversitaireRepository;

    @Autowired
    private InscriptionRepository inscriptionRepository;

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private FiliereRepository filiereRepository;

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    private Long activeGroupId;
    private Long emptyGroupId;

    @BeforeEach
    void setUp() {
        jdbcTemplate.execute("DELETE FROM inscriptions");
        jdbcTemplate.execute("DELETE FROM user_roles");
        jdbcTemplate.execute("DELETE FROM admins");
        jdbcTemplate.execute("DELETE FROM teachers");
        jdbcTemplate.execute("DELETE FROM students");
        jdbcTemplate.execute("DELETE FROM users");
        jdbcTemplate.execute("DELETE FROM groupes");
        jdbcTemplate.execute("DELETE FROM modules");
        jdbcTemplate.execute("DELETE FROM formations");
        jdbcTemplate.execute("DELETE FROM cycles");
        jdbcTemplate.execute("DELETE FROM filieres");
        jdbcTemplate.execute("DELETE FROM annee_universitaires");

        AnneeUniversitaire activeYear = AnneeUniversitaire
                .builder()
                .name("2025-2026")
                .startDate(LocalDate.of(2025, 9, 1))
                .endDate(LocalDate.of(2026, 6, 30))
                .active(true)
                .build();
        activeYear = anneeUniversitaireRepository.save(activeYear);

        AnneeUniversitaire inactiveYear = AnneeUniversitaire
                .builder()
                .name("2024-2025")
                .startDate(LocalDate.of(2024, 9, 1))
                .endDate(LocalDate.of(2025, 6, 30))
                .active(false)
                .build();
        inactiveYear = anneeUniversitaireRepository.save(inactiveYear);

        Cycle cycle = Cycle.builder()
                .code("CI")
                .name("Cycle Ingenieur")
                .type(CycleType.INGENIEUR)
                .build();
        cycle = cycleRepository.save(cycle);

        Filiere filiere = Filiere.builder()
                .code("GI")
                .name("Genie Informatique")
                .build();
        filiere = filiereRepository.save(filiere);

        Formation formation = Formation.builder()
                .anneeUniversitaire(activeYear)
                .cycle(cycle)
                .filiere(filiere)
                .build();
        formation = formationRepository.save(formation);

        Groupe activeGroup = Groupe
                .builder()
                .name("GI-1")
                .formation(formation)
                .build();
        activeGroup = groupeRepository.save(activeGroup);
        activeGroupId = activeGroup.getId();

        Groupe secondGroup = Groupe
                .builder()
                .name("GI-2")
                .formation(formation)
                .build();
        secondGroup = groupeRepository.save(secondGroup);
        emptyGroupId = secondGroup.getId();

        Student activeStudent = Student.builder()
                .email("active.student@ump.ac.ma")
                .firstName("Active")
                .lastName("Student")
                .pfpUrl("https://cdn.example.com/active.jpg")
                .roles(Set.of(Role.STUDENT))
                .numApogee("A001")
                .build();
        activeStudent = userRepository.save(activeStudent);

        Student inactiveStudent = Student.builder()
                .email("inactive.student@ump.ac.ma")
                .firstName("Inactive")
                .lastName("Student")
                .pfpUrl("https://cdn.example.com/inactive.jpg")
                .roles(Set.of(Role.STUDENT))
                .numApogee("A002")
                .build();
        inactiveStudent = userRepository.save(inactiveStudent);

        Inscription activeInscription = new Inscription();
        activeInscription.setStudent(activeStudent);
        activeInscription.setGroupe(activeGroup);
        activeInscription.setAnneeUniversitaire(activeYear);
        inscriptionRepository.save(activeInscription);

        Inscription inactiveInscription = new Inscription();
        inactiveInscription.setStudent(inactiveStudent);
        inactiveInscription.setGroupe(activeGroup);
        inactiveInscription.setAnneeUniversitaire(inactiveYear);
        inscriptionRepository.save(inactiveInscription);
    }

    @Test
    void rosterReturnsOnlyActiveYearStudents() throws Exception {
        mockMvc.perform(get("/users/internal/students/roster")
                        .header("X-Request-Source", "attendance-service")
                        .queryParam("groupIds", String.valueOf(activeGroupId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(1))
                .andExpect(jsonPath("$[0].groupId").value(activeGroupId))
                .andExpect(jsonPath("$[0].firstName").value("Active"))
                .andExpect(jsonPath("$[0].pfpUrl").value("https://cdn.example.com/active.jpg"))
                .andExpect(jsonPath("$[0].numApogee").value("A001"));
    }

    @Test
    void rosterReturnsEmptyListWhenNoActiveYearStudentsMatch() throws Exception {
        mockMvc.perform(get("/users/internal/students/roster")
                        .header("X-Request-Source", "attendance-service")
                        .queryParam("groupIds", String.valueOf(emptyGroupId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(0));
    }

    @Test
    void rosterRejectsMissingGroupIds() throws Exception {
        mockMvc.perform(get("/users/internal/students/roster")
                        .header("X-Request-Source", "attendance-service")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    void rosterRejectsUntrustedCaller() throws Exception {
        mockMvc.perform(get("/users/internal/students/roster")
                        .queryParam("groupIds", String.valueOf(activeGroupId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void rosterReturnsConflictWhenNoActiveAcademicYearExists() throws Exception {
        anneeUniversitaireRepository.findAll().forEach(year -> {
            year.setActive(false);
            anneeUniversitaireRepository.save(year);
        });

        mockMvc.perform(get("/users/internal/students/roster")
                        .header("X-Request-Source", "attendance-service")
                        .queryParam("groupIds", String.valueOf(activeGroupId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }

    @Test
    void rosterReturnsConflictWhenMultipleActiveAcademicYearsExist() throws Exception {
        AnneeUniversitaire extraActiveYear = AnneeUniversitaire
                .builder()
                .name("2026-2027")
                .startDate(LocalDate.of(2026, 9, 1))
                .endDate(LocalDate.of(2027, 6, 30))
                .active(true)
                .build();
        anneeUniversitaireRepository.save(extraActiveYear);

        mockMvc.perform(get("/users/internal/students/roster")
                        .header("X-Request-Source", "attendance-service")
                        .queryParam("groupIds", String.valueOf(activeGroupId))
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isConflict());
    }
}
