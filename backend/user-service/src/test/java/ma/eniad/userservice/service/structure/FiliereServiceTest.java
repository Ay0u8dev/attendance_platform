package ma.eniad.userservice.service.structure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.structure.FiliereRequestDTO;
import ma.eniad.userservice.dto.structure.FiliereResponseDTO;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.FiliereMapper;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class FiliereServiceTest {

    @Mock
    private FiliereRepository repository;

    @Mock
    private FiliereMapper mapper;

    @InjectMocks
    private FiliereService service;

    @Test
    void createSavesFiliereWhenCodeIsUnique() {
        FiliereRequestDTO request = request("GI");
        Filiere entity = entity(1L, "GI");
        FiliereResponseDTO response = response(1L, "GI");

        when(repository.existsByCode("GI")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);
        verify(repository).save(entity);
    }

    @Test
    void createThrowsWhenCodeAlreadyExists() {
        FiliereRequestDTO request = request("GI");
        when(repository.existsByCode("GI")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Filiere code already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void updateAllowsKeepingSameCode() {
        FiliereRequestDTO request = request("GI");
        Filiere entity = entity(1L, "GI");
        FiliereResponseDTO response = response(1L, "GI");

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(1L, request)).isSameAs(response);
        verify(repository, never()).existsByCode("GI");
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNewCodeAlreadyExists() {
        FiliereRequestDTO request = request("GIND");
        when(repository.findById(1L)).thenReturn(Optional.of(entity(1L, "GI")));
        when(repository.existsByCode("GIND")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Filiere code already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void deleteRemovesExistingFiliere() {
        Filiere entity = entity(1L, "GI");
        when(repository.findById(1L)).thenReturn(Optional.of(entity));

        service.delete(1L);

        verify(repository).delete(entity);
    }

    @Test
    void getAllMapsEveryFiliere() {
        Filiere first = entity(1L, "GI");
        Filiere second = entity(2L, "GIND");
        FiliereResponseDTO firstResponse = response(1L, "GI");
        FiliereResponseDTO secondResponse = response(2L, "GIND");

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void getByIdThrowsWhenFiliereDoesNotExist() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(404L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Filiere not found with id: 404");
    }

    private static FiliereRequestDTO request(String code) {
        FiliereRequestDTO request = new FiliereRequestDTO();
        request.setCode(code);
        request.setName(code + " filiere");
        return request;
    }

    private static Filiere entity(Long id, String code) {
        return Filiere.builder()
                .id(id)
                .code(code)
                .name(code + " filiere")
                .build();
    }

    private static FiliereResponseDTO response(Long id, String code) {
        return FiliereResponseDTO.builder()
                .id(id)
                .code(code)
                .name(code + " filiere")
                .build();
    }
}
