package ma.eniad.userservice.controller.structure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.eniad.userservice.dto.structure.GroupeRequestDTO;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpStatus;

import static org.assertj.core.api.Assertions.assertThat;

import java.time.LocalDate;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@AutoConfigureTestRestTemplate
class GroupeControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private AnneeUniversitaireRepository anneeRepository;

    @Autowired
    private FiliereRepository filiereRepository;

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private GroupeRepository groupeRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @BeforeEach
    void setUp() {
        moduleRepository.deleteAllInBatch();
        groupeRepository.deleteAllInBatch();
        formationRepository.deleteAllInBatch();
        anneeRepository.deleteAllInBatch();
        filiereRepository.deleteAllInBatch();
        cycleRepository.deleteAllInBatch();
    }

    @Test
    void createAndGetGroupe() throws Exception {
        AnneeUniversitaire annee = AnneeUniversitaire.builder()
                .name("2025-2026")
                .startDate(LocalDate.of(2025,9,1))
                .endDate(LocalDate.of(2026,7,31))
                .active(true)
                .build();
        annee = anneeRepository.save(annee);

        Filiere filiere = Filiere.builder().code("F01").name("F1").build();
        filiere = filiereRepository.save(filiere);

        Cycle cycle = Cycle.builder().code("C01").name("C1").type(CycleType.INGENIEUR).build();
        cycle = cycleRepository.save(cycle);

        Formation formation = Formation.builder().anneeUniversitaire(annee).filiere(filiere).cycle(cycle).build();
        formation = formationRepository.save(formation);

        GroupeRequestDTO request = new GroupeRequestDTO();
        request.setName("Groupe A");
        request.setFormationId(formation.getId());

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "test-user");
        headers.set("X-User-Roles", "ADMIN");
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> create = restTemplate.postForEntity(
                "/users/structure/groupes",
                new HttpEntity<>(request, headers),
                String.class
        );

        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(create.getBody()).isNotNull();
        JsonNode createBody = objectMapper.readTree(create.getBody());
        long id = createBody.get("id").asLong();

        ResponseEntity<String> get = restTemplate.exchange(
            "/users/structure/groupes/" + id,
            HttpMethod.GET,
            new HttpEntity<>(headers),
            String.class
        );

        assertThat(get.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode getBody = objectMapper.readTree(get.getBody());
        assertThat(getBody.get("name").asText()).isEqualTo("Groupe A");
    }
}
