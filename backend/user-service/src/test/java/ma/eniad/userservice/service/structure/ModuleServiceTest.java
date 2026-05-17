package ma.eniad.userservice.service.structure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.structure.ModuleRequestDTO;
import ma.eniad.userservice.dto.structure.ModuleResponseDTO;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.ModuleMapper;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class ModuleServiceTest {

    @Mock
    private ModuleRepository repository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private ModuleMapper mapper;

    @InjectMocks
    private ModuleService service;

    @Test
    void createLinksFormationAndSavesModuleWhenCodeIsUniqueInFormation() {
        ModuleRequestDTO request = request("ALG", 10L);
        ma.eniad.userservice.entity.structure.Module entity = module(null, "ALG", null);
        Formation formation = Formation.builder().id(10L).build();
        ModuleResponseDTO response = response(1L, "ALG", 10L);

        when(repository.existsByFormationIdAndCode(10L, "ALG")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(formationRepository.findById(10L)).thenReturn(Optional.of(formation));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);

        ArgumentCaptor<ma.eniad.userservice.entity.structure.Module> captor =
                ArgumentCaptor.forClass(ma.eniad.userservice.entity.structure.Module.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFormation()).isSameAs(formation);
    }

    @Test
    void createThrowsWhenCodeAlreadyExistsInFormation() {
        ModuleRequestDTO request = request("ALG", 10L);
        when(repository.existsByFormationIdAndCode(10L, "ALG")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Module code already exists for this formation");

        verify(repository, never()).save(any());
    }

    @Test
    void createThrowsWhenFormationDoesNotExist() {
        ModuleRequestDTO request = request("ALG", 10L);
        when(repository.existsByFormationIdAndCode(10L, "ALG")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(module(null, "ALG", null));
        when(formationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Formation not found with id: 10");
    }

    @Test
    void updateAllowsSameCodeInsideSameFormation() {
        ModuleRequestDTO request = request("ALG", 10L);
        Formation formation = Formation.builder().id(10L).build();
        ma.eniad.userservice.entity.structure.Module entity = module(1L, "ALG", formation);
        ModuleResponseDTO response = response(1L, "ALG", 10L);

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.existsByFormationIdAndCode(10L, "ALG")).thenReturn(true);
        when(formationRepository.findById(10L)).thenReturn(Optional.of(formation));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(1L, request)).isSameAs(response);
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenCodeBelongsToAnotherModuleInFormation() {
        ModuleRequestDTO request = request("POO", 10L);
        ma.eniad.userservice.entity.structure.Module entity =
                module(1L, "ALG", Formation.builder().id(10L).build());

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.existsByFormationIdAndCode(10L, "POO")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Module code already exists for this formation");

        verify(repository, never()).save(any());
    }

    @Test
    void getAllMapsEveryModule() {
        Formation formation = Formation.builder().id(10L).build();
        ma.eniad.userservice.entity.structure.Module first = module(1L, "ALG", formation);
        ma.eniad.userservice.entity.structure.Module second = module(2L, "POO", formation);
        ModuleResponseDTO firstResponse = response(1L, "ALG", 10L);
        ModuleResponseDTO secondResponse = response(2L, "POO", 10L);

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void deleteThrowsWhenModuleDoesNotExist() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.delete(404L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Module not found with id: 404");
    }

    private static ModuleRequestDTO request(String code, Long formationId) {
        ModuleRequestDTO request = new ModuleRequestDTO();
        request.setCode(code);
        request.setName(code + " module");
        request.setSemester(1);
        request.setHours(40);
        request.setFormationId(formationId);
        return request;
    }

    private static ma.eniad.userservice.entity.structure.Module module(Long id, String code, Formation formation) {
        return ma.eniad.userservice.entity.structure.Module.builder()
                .id(id)
                .code(code)
                .name(code + " module")
                .semester(1)
                .hours(40)
                .formation(formation)
                .build();
    }

    private static ModuleResponseDTO response(Long id, String code, Long formationId) {
        return ModuleResponseDTO.builder()
                .id(id)
                .code(code)
                .name(code + " module")
                .semester(1)
                .hours(40)
                .formationId(formationId)
                .build();
    }
}
