package ma.eniad.userservice.service.structure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.structure.CycleRequestDTO;
import ma.eniad.userservice.dto.structure.CycleResponseDTO;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.CycleMapper;
import ma.eniad.userservice.repository.structure.CycleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class CycleServiceTest {

    @Mock
    private CycleRepository repository;

    @Mock
    private CycleMapper mapper;

    @InjectMocks
    private CycleService service;

    @Test
    void createSavesCycleWhenCodeIsUnique() {
        CycleRequestDTO request = request("ING");
        Cycle entity = entity(1L, "ING");
        CycleResponseDTO response = response(1L, "ING");

        when(repository.existsByCode("ING")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);
        verify(repository).save(entity);
    }

    @Test
    void createThrowsWhenCodeAlreadyExists() {
        CycleRequestDTO request = request("ING");
        when(repository.existsByCode("ING")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Cycle code already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void updateAllowsKeepingSameCode() {
        CycleRequestDTO request = request("ING");
        Cycle entity = entity(1L, "ING");
        CycleResponseDTO response = response(1L, "ING");

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(1L, request)).isSameAs(response);
        verify(repository, never()).existsByCode("ING");
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNewCodeAlreadyExists() {
        CycleRequestDTO request = request("LST");
        when(repository.findById(1L)).thenReturn(Optional.of(entity(1L, "ING")));
        when(repository.existsByCode("LST")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Cycle code already exists");

        verify(repository, never()).save(any());
    }

    @Test
    void getByIdThrowsWhenCycleDoesNotExist() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(404L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Cycle not found with id: 404");
    }

    @Test
    void getAllMapsEveryCycle() {
        Cycle first = entity(1L, "ING");
        Cycle second = entity(2L, "LST");
        CycleResponseDTO firstResponse = response(1L, "ING");
        CycleResponseDTO secondResponse = response(2L, "LST");

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    private static CycleRequestDTO request(String code) {
        CycleRequestDTO request = new CycleRequestDTO();
        request.setCode(code);
        request.setName(code + " cycle");
        request.setType(CycleType.INGENIEUR);
        return request;
    }

    private static Cycle entity(Long id, String code) {
        return Cycle.builder()
                .id(id)
                .code(code)
                .name(code + " cycle")
                .type(CycleType.INGENIEUR)
                .build();
    }

    private static CycleResponseDTO response(Long id, String code) {
        return CycleResponseDTO.builder()
                .id(id)
                .code(code)
                .name(code + " cycle")
                .type(CycleType.INGENIEUR)
                .build();
    }
}
