package ma.eniad.userservice.controller;

import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

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

    private Long activeGroupId;
    private Long emptyGroupId;

    @BeforeEach
    void setUp() {
        inscriptionRepository.deleteAll();
        groupeRepository.deleteAll();
        userRepository.deleteAll();
        anneeUniversitaireRepository.deleteAll();

        AnneeUniversitaire activeYear = AnneeUniversitaire
                .builder()
                .name("2025-2026")
                .active(true)
                .build();
        activeYear = anneeUniversitaireRepository.save(activeYear);

        AnneeUniversitaire inactiveYear = AnneeUniversitaire
                .builder()
                .name("2024-2025")
                .active(false)
                .build();
        inactiveYear = anneeUniversitaireRepository.save(inactiveYear);

        Groupe activeGroup = Groupe
                .builder()
                .name("GI-1")
                .build();
        activeGroup = groupeRepository.save(activeGroup);
        activeGroupId = activeGroup.getId();

        Groupe secondGroup = Groupe
                .builder()
                .name("GI-2")
                .build();
        secondGroup = groupeRepository.save(secondGroup);
        emptyGroupId = secondGroup.getId();

        Student activeStudent = Student.builder()
                .email("active.student@ump.ac.ma")
                .firstName("Active")
                .lastName("Student")
                .roles(Set.of(Role.STUDENT))
                .numApogee("A001")
                .build();
        activeStudent = userRepository.save(activeStudent);

        Student inactiveStudent = Student.builder()
                .email("inactive.student@ump.ac.ma")
                .firstName("Inactive")
                .lastName("Student")
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
