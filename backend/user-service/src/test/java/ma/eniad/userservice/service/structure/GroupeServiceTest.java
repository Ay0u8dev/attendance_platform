package ma.eniad.userservice.service.structure;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.structure.GroupeRequestDTO;
import ma.eniad.userservice.dto.structure.GroupeResponseDTO;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.GroupeMapper;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class GroupeServiceTest {

    @Mock
    private GroupeRepository repository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private GroupeMapper mapper;

    @InjectMocks
    private GroupeService service;

    @Test
    void createLinksFormationAndSavesGroupeWhenNameIsUniqueInFormation() {
        GroupeRequestDTO request = request("G1", 10L);
        Groupe entity = Groupe.builder().name("G1").build();
        Formation formation = Formation.builder().id(10L).build();
        GroupeResponseDTO response = response(1L, "G1", 10L);

        when(repository.existsByFormationIdAndName(10L, "G1")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(entity);
        when(formationRepository.findById(10L)).thenReturn(Optional.of(formation));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.create(request)).isSameAs(response);

        ArgumentCaptor<Groupe> captor = ArgumentCaptor.forClass(Groupe.class);
        verify(repository).save(captor.capture());
        assertThat(captor.getValue().getFormation()).isSameAs(formation);
    }

    @Test
    void createThrowsWhenNameAlreadyExistsInFormation() {
        GroupeRequestDTO request = request("G1", 10L);
        when(repository.existsByFormationIdAndName(10L, "G1")).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Groupe name already exists for this formation");

        verify(repository, never()).save(any());
    }

    @Test
    void createThrowsWhenFormationDoesNotExist() {
        GroupeRequestDTO request = request("G1", 10L);
        when(repository.existsByFormationIdAndName(10L, "G1")).thenReturn(false);
        when(mapper.toEntity(request)).thenReturn(Groupe.builder().name("G1").build());
        when(formationRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Formation not found with id: 10");
    }

    @Test
    void updateAllowsSameNameInsideSameFormation() {
        GroupeRequestDTO request = request("G1", 10L);
        Formation formation = Formation.builder().id(10L).build();
        Groupe entity = Groupe.builder().id(1L).name("G1").formation(formation).build();
        GroupeResponseDTO response = response(1L, "G1", 10L);

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.existsByFormationIdAndName(10L, "G1")).thenReturn(true);
        when(formationRepository.findById(10L)).thenReturn(Optional.of(formation));
        when(repository.save(entity)).thenReturn(entity);
        when(mapper.toResponse(entity)).thenReturn(response);

        assertThat(service.update(1L, request)).isSameAs(response);
        verify(mapper).updateEntity(request, entity);
    }

    @Test
    void updateThrowsWhenNameBelongsToAnotherGroupeInFormation() {
        GroupeRequestDTO request = request("G2", 10L);
        Groupe entity = Groupe.builder()
                .id(1L)
                .name("G1")
                .formation(Formation.builder().id(10L).build())
                .build();

        when(repository.findById(1L)).thenReturn(Optional.of(entity));
        when(repository.existsByFormationIdAndName(10L, "G2")).thenReturn(true);

        assertThatThrownBy(() -> service.update(1L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Groupe name already exists for this formation");

        verify(repository, never()).save(any());
    }

    @Test
    void getAllMapsEveryGroupe() {
        Formation formation = Formation.builder().id(10L).build();
        Groupe first = Groupe.builder().id(1L).name("G1").formation(formation).build();
        Groupe second = Groupe.builder().id(2L).name("G2").formation(formation).build();
        GroupeResponseDTO firstResponse = response(1L, "G1", 10L);
        GroupeResponseDTO secondResponse = response(2L, "G2", 10L);

        when(repository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void getByIdThrowsWhenGroupeDoesNotExist() {
        when(repository.findById(404L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(404L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Groupe not found with id: 404");
    }

    private static GroupeRequestDTO request(String name, Long formationId) {
        GroupeRequestDTO request = new GroupeRequestDTO();
        request.setName(name);
        request.setFormationId(formationId);
        return request;
    }

    private static GroupeResponseDTO response(Long id, String name, Long formationId) {
        return GroupeResponseDTO.builder()
                .id(id)
                .name(name)
                .formationId(formationId)
                .build();
    }
}
