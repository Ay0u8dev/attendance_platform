package ma.eniad.userservice.controller.structure;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import ma.eniad.userservice.dto.structure.CycleRequestDTO;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.structure.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.jdbc.test.autoconfigure.AutoConfigureTestDatabase;
import org.springframework.boot.resttestclient.TestRestTemplate;
import org.springframework.boot.resttestclient.autoconfigure.AutoConfigureTestRestTemplate;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.*;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
@AutoConfigureTestDatabase(replace = AutoConfigureTestDatabase.Replace.ANY)
@AutoConfigureTestRestTemplate
class CycleControllerTest {

    @Autowired
    private TestRestTemplate restTemplate;

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Autowired
    private CycleRepository cycleRepository;

    @Autowired
    private AnneeUniversitaireRepository anneeRepository;

    @Autowired
    private FiliereRepository filiereRepository;

    @Autowired
    private FormationRepository formationRepository;

    @Autowired
    private GroupeRepository groupeRepository;

    @Autowired
    private ModuleRepository moduleRepository;

    @Autowired
    private InscriptionRepository inscriptionRepository;

    @BeforeEach
    void setUp() {
        inscriptionRepository.deleteAllInBatch();
        moduleRepository.deleteAllInBatch();
        groupeRepository.deleteAllInBatch();
        formationRepository.deleteAllInBatch();
        anneeRepository.deleteAllInBatch();
        filiereRepository.deleteAllInBatch();
        cycleRepository.deleteAllInBatch();
    }

    @Test
    void createAndGetCycle() throws Exception {
        CycleRequestDTO request = new CycleRequestDTO();
        request.setCode("CYCX");
        request.setName("Cycle X");
        request.setType(CycleType.INGENIEUR);

        HttpHeaders headers = new HttpHeaders();
        headers.set("X-User-Id", "test-user");
        headers.set("X-User-Roles", "ADMIN");
        headers.setContentType(MediaType.APPLICATION_JSON);

        ResponseEntity<String> create = restTemplate.postForEntity(
                "/users/structure/cycles",
                new HttpEntity<>(request, headers),
                String.class
        );

        assertThat(create.getStatusCode()).isEqualTo(HttpStatus.CREATED);
        assertThat(create.getBody()).isNotNull();
        JsonNode createBody = objectMapper.readTree(create.getBody());
        long id = createBody.get("id").asLong();

        ResponseEntity<String> get = restTemplate.exchange(
                "/users/structure/cycles/" + id,
                HttpMethod.GET,
                new HttpEntity<>(headers),
                String.class
        );

        assertThat(get.getStatusCode()).isEqualTo(HttpStatus.OK);
        JsonNode getBody = objectMapper.readTree(get.getBody());
        assertThat(getBody.get("code").asText()).isEqualTo("CYCX");
    }
}
