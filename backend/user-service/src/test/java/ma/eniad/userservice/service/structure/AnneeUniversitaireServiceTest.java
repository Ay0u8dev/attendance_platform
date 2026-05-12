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

import ma.eniad.userservice.dto.structure.AnneeRequestDTO;
import ma.eniad.userservice.dto.structure.AnneeResponseDTO;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.AnneeUniversitaireMapper;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class AnneeUniversitaireServiceTest {

    @Mock
    private AnneeUniversitaireRepository repository;

    @Mock
    private AnneeUniversitaireMapper mapper;

    @InjectMocks
    private AnneeUniversitaireService service;

    @Test
    void createSavesAcademicYearWhenNameIsUnique() {
        AnneeRequestDTO request = request("2025-2026");
        AnneeUniversitaire entity = entity(1L, "2025-2026");
        AnneeResponseDTO response = response(1L, "2025-2026");

        when(repository.existsByName("2025-2026")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);
        verify(repository).save(entity);
    }

    @Test
    void createThrowsWhenNameAlreadyExists() {
        AnneeRequestDTO request = request("2025-2026");
        when(repository.existsByName("2025-2026")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Academic year name already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void updateAllowsKeepingSameNameWithoutDuplicateLookup() {
        AnneeRequestDTO request = request("2025-2026");
        AnneeUniversitaire entity = entity(1L, "2025-2026");
        AnneeResponseDTO response = response(1L, "2025-2026");

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(1L, request)).isSameAs(response);
        verify(repository, never()).existsByName("2025-2026");
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNewNameBelongsToAnotherAcademicYear() {
        AnneeRequestDTO request = request("2026-2027");
        when(repository.findById(1L)).thenReturn(Optional.of(entity(1L, "2025-2026")));
        when(repository.existsByName("2026-2027")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Academic year name already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void getAllMapsEveryAcademicYear() {
        AnneeUniversitaire first = entity(1L, "2024-2025");
        AnneeUniversitaire second = entity(2L, "2025-2026");
        AnneeResponseDTO firstResponse = response(1L, "2024-2025");
        AnneeResponseDTO secondResponse = response(2L, "2025-2026");

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void deleteThrowsWhenAcademicYearDoesNotExist() {
        when(repository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(99L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Academic year not found with id: 99");
    }

    private static AnneeRequestDTO request(String name) {
        AnneeRequestDTO request = new AnneeRequestDTO();
        request.setName(name);
        request.setStartDate(LocalDate.of(2025, 9, 1));
        request.setEndDate(LocalDate.of(2026, 7, 31));
        request.setActive(true);
        return request;
    }

    private static AnneeUniversitaire entity(Long id, String name) {
        return AnneeUniversitaire.builder()
                .id(id)
                .name(name)
                .startDate(LocalDate.of(2025, 9, 1))
                .endDate(LocalDate.of(2026, 7, 31))
                .active(true)
                .build();
    }

    private static AnneeResponseDTO response(Long id, String name) {
        return AnneeResponseDTO.builder()
                .id(id)
                .name(name)
                .startDate(LocalDate.of(2025, 9, 1))
                .endDate(LocalDate.of(2026, 7, 31))
                .active(true)
                .build();
    }
}
