package ma.eniad.userservice.service.structure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.FormationMapper;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FormationServiceTest {

    @Mock
    private FormationRepository repository;

    @Mock
    private AnneeUniversitaireRepository anneeRepository;

    @Mock
    private FiliereRepository filiereRepository;

    @Mock
    private CycleRepository cycleRepository;

    @Mock
    private FormationMapper mapper;

    @InjectMocks
    private FormationService service;

    @Test
    void createLinksParentsAndSavesFormationWhenCombinationIsUnique() {
        FormationRequestDTO request = request("Formation X", 1L, 2L, 3L);
        Formation entity = Formation.builder().build();
        AnneeUniversitaire annee = annee(1L);
        Filiere filiere = filiere(2L);
        Cycle cycle = cycle(3L);
        FormationResponseDTO response = response(10L, "Formation X", 1L, 2L, 3L);

        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle));
        when(repository.existsByAnneeUniversitaireIdAndCycleIdAndName(1L, 3L, "Formation X")).thenReturn(false);
        when(filiereRepository.findById(2L)).thenReturn(Optional.of(filiere));
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);

        ArgumentCaptor<Formation> captor = ArgumentCaptor.forClass(Formation.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getAnneeUniversitaire()).isSameAs(annee);
        assertThat(captor.getValue().getFiliere()).isSameAs(filiere);
        assertThat(captor.getValue().getCycle()).isSameAs(cycle);
    }

    @Test
    void createThrowsWhenFormationYearCycleNameAlreadyExists() {
        FormationRequestDTO request = request("Formation X", 1L, 2L, 3L);
        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee(1L)));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle(3L)));
        when(repository.existsByAnneeUniversitaireIdAndCycleIdAndName(1L, 3L, "Formation X")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Formation already exists for the given year, cycle, and name: Formation X");

        verify(repository, never()).save(any());
    }

    @Test
    void createThrowsWhenAcademicYearDoesNotExist() {
        FormationRequestDTO request = request("Formation X", 1L, 2L, 3L);
        when(anneeRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Academic year not found with id: 1");
    }

    @Test
    void createAllowsPrepaFormationWithoutFiliere() {
        FormationRequestDTO request = request("CP1", 1L, null, 3L);
        Formation entity = Formation.builder().build();
        AnneeUniversitaire annee = annee(1L);
        Cycle cycle = prepaCycle(3L);
        FormationResponseDTO response = response(10L, "CP1", 1L, null, 3L);

        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle));
        when(repository.existsByAnneeUniversitaireIdAndCycleIdAndName(1L, 3L, "CP1")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);

        verify(filiereRepository, never()).findById(any());
        assertThat(entity.getFiliere()).isNull();
    }

    @Test
    void createRejectsFiliereForPrepaCycle() {
        FormationRequestDTO request = request("CP1", 1L, 2L, 3L);

        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee(1L)));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(prepaCycle(3L)));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("PREPA cycle must not have filiere");

        verify(repository, never()).save(any());
    }

    @Test
    void createRejectsMissingFiliereForNonPrepaCycle() {
        FormationRequestDTO request = request("Formation X", 1L, null, 3L);

        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee(1L)));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle(3L)));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Filiere is required for non-PREPA cycle");

        verify(repository, never()).save(any());
    }

    @Test
    void updateAllowsSameFormationWhenYearCycleNameBelongsToCurrentEntity() {
        FormationRequestDTO request = request("Formation X", 1L, 2L, 3L);
        AnneeUniversitaire annee = annee(1L);
        Filiere filiere = filiere(2L);
        Cycle cycle = cycle(3L);
        Formation entity = formation(10L, annee, filiere, cycle);
        FormationResponseDTO response = response(10L, "Formation X", 1L, 2L, 3L);

        when(repository.findById(10L)).thenReturn(Optional.of(entity));
        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle));
        when(repository.existsByAnneeUniversitaireIdAndCycleIdAndNameAndIdNot(1L, 3L, "Formation X", 10L))
                .thenReturn(false);
        when(filiereRepository.findById(2L)).thenReturn(Optional.of(filiere));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(10L, request)).isSameAs(response);
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNewYearCycleNameBelongsToAnotherFormation() {
        FormationRequestDTO request = request("Formation Y", 4L, 5L, 6L);
        Formation entity = formation(10L, annee(1L), filiere(2L), cycle(3L));

        when(repository.findById(10L)).thenReturn(Optional.of(entity));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee(4L)));
        when(cycleRepository.findById(6L)).thenReturn(Optional.of(cycle(6L)));
        when(repository.existsByAnneeUniversitaireIdAndCycleIdAndNameAndIdNot(4L, 6L, "Formation Y", 10L))
                .thenReturn(true);

        assertThatThrownBy(() -> service.update(10L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Formation already exists for the given year, cycle, and name: Formation Y");

        verify(repository, never()).save(any());
    }

    @Test
    void getAllMapsEveryFormation() {
        Formation first = formation(10L, annee(1L), filiere(2L), cycle(3L));
        Formation second = formation(11L, annee(4L), filiere(5L), cycle(6L));
        FormationResponseDTO firstResponse = response(10L, "Formation 1", 1L, 2L, 3L);
        FormationResponseDTO secondResponse = response(11L, "Formation 2", 4L, 5L, 6L);

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void deleteThrowsWhenFormationDoesNotExist() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Formation not found with id: 99");
    }

    private static FormationRequestDTO request(String name, Long anneeId, Long filiereId, Long cycleId) {
        FormationRequestDTO request = new FormationRequestDTO();
        request.setName(name);
        request.setAnneeUniversitaireId(anneeId);
        request.setFiliereId(filiereId);
        request.setCycleId(cycleId);
        return request;
    }

    private static Formation formation(Long id, AnneeUniversitaire annee, Filiere filiere, Cycle cycle) {
        return Formation.builder()
                .id(id)
                .name("Formation X")
                .anneeUniversitaire(annee)
                .filiere(filiere)
                .cycle(cycle)
                .build();
    }

    private static AnneeUniversitaire annee(Long id) {
        return AnneeUniversitaire.builder()
                .id(id)
                .name("2025-2026")
                .startDate(LocalDate.of(2025, 9, 1))
                .endDate(LocalDate.of(2026, 7, 31))
                .build();
    }

    private static Filiere filiere(Long id) {
        return Filiere.builder()
                .id(id)
                .code("GI")
                .name("Genie Informatique")
                .build();
    }

    private static Cycle cycle(Long id) {
        return Cycle.builder()
                .id(id)
                .code("ING")
                .name("Ingenieur")
                .type(CycleType.INGENIEUR)
                .build();
    }

    private static Cycle prepaCycle(Long id) {
        return Cycle.builder()
                .id(id)
                .code("PREPA")
                .name("Classes preparatoires")
                .type(CycleType.PREPA)
                .build();
    }

    private static FormationResponseDTO response(Long id, String name, Long anneeId, Long filiereId, Long cycleId) {
        return FormationResponseDTO.builder()
                .id(id)
                .name(name)
                .anneeUniversitaireId(anneeId)
                .filiereId(filiereId)
                .cycleId(cycleId)
                .build();
    }
}
