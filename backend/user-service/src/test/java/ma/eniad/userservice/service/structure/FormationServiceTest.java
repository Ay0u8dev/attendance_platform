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
import ma.eniad.userservice.exception.structure.DuplicateResourceException;
import ma.eniad.userservice.exception.structure.ResourceNotFoundException;
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
        FormationRequestDTO request = request(1L, 2L, 3L);
        Formation entity = Formation.builder().build();
        AnneeUniversitaire annee = annee(1L);
        Filiere filiere = filiere(2L);
        Cycle cycle = cycle(3L);
        FormationResponseDTO response = response(10L, 1L, 2L, 3L);

        when(repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(1L, 2L, 3L)).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee));
        when(filiereRepository.findById(2L)).thenReturn(Optional.of(filiere));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle));
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
    void createThrowsWhenFormationCombinationAlreadyExists() {
        FormationRequestDTO request = request(1L, 2L, 3L);
        when(repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(1L, 2L, 3L)).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Formation already exists for the given year, filiere, and cycle");

        verify(repository, never()).save(any());
    }

    @Test
    void createThrowsWhenAcademicYearDoesNotExist() {
        FormationRequestDTO request = request(1L, 2L, 3L);
        when(repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(1L, 2L, 3L)).thenReturn(false);
        when(anneeRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Academic year not found with id: 1");
    }

    @Test
    void updateAllowsSameExistingCombinationEvenIfRepositoryReportsItExists() {
        FormationRequestDTO request = request(1L, 2L, 3L);
        AnneeUniversitaire annee = annee(1L);
        Filiere filiere = filiere(2L);
        Cycle cycle = cycle(3L);
        Formation entity = formation(10L, annee, filiere, cycle);
        FormationResponseDTO response = response(10L, 1L, 2L, 3L);

        when(repository.findById(10L)).thenReturn(Optional.of(entity));
        when(anneeRepository.findById(1L)).thenReturn(Optional.of(annee));
        when(filiereRepository.findById(2L)).thenReturn(Optional.of(filiere));
        when(cycleRepository.findById(3L)).thenReturn(Optional.of(cycle));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(10L, request)).isSameAs(response);
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNewCombinationBelongsToAnotherFormation() {
        FormationRequestDTO request = request(4L, 5L, 6L);
        Formation entity = formation(10L, annee(1L), filiere(2L), cycle(3L));

        when(repository.findById(10L)).thenReturn(Optional.of(entity));
        when(repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(4L, 5L, 6L)).thenReturn(true);

        assertThatThrownBy(() -> service.update(10L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Formation already exists for the given year, filiere, and cycle");

        verify(repository, never()).save(any());
    }

    @Test
    void getAllMapsEveryFormation() {
        Formation first = formation(10L, annee(1L), filiere(2L), cycle(3L));
        Formation second = formation(11L, annee(4L), filiere(5L), cycle(6L));
        FormationResponseDTO firstResponse = response(10L, 1L, 2L, 3L);
        FormationResponseDTO secondResponse = response(11L, 4L, 5L, 6L);

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

    private static FormationRequestDTO request(Long anneeId, Long filiereId, Long cycleId) {
        FormationRequestDTO request = new FormationRequestDTO();
        request.setAnneeUniversitaireId(anneeId);
        request.setFiliereId(filiereId);
        request.setCycleId(cycleId);
        return request;
    }

    private static Formation formation(Long id, AnneeUniversitaire annee, Filiere filiere, Cycle cycle) {
        return Formation.builder()
                .id(id)
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

    private static FormationResponseDTO response(Long id, Long anneeId, Long filiereId, Long cycleId) {
        return FormationResponseDTO.builder()
                .id(id)
                .anneeUniversitaireId(anneeId)
                .filiereId(filiereId)
                .cycleId(cycleId)
                .build();
    }
}
