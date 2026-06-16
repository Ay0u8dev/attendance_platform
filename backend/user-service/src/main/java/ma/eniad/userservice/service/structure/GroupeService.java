package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.GroupeRequestDTO;
import ma.eniad.userservice.dto.structure.GroupeResponseDTO;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.GroupeMapper;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class GroupeService {

    private final GroupeRepository repository;
    private final FormationRepository formationRepository;
    private final GroupeMapper mapper;

    public GroupeResponseDTO create(GroupeRequestDTO request) {
        if (repository.existsByFormationIdAndName(request.getFormationId(), request.getName())) {
            throw new DuplicateResourceException("Groupe name already exists for this formation");
        }
        Groupe entity = mapper.toEntity(request);
        entity.setFormation(getFormation(request.getFormationId()));
        return mapper.toResponse(repository.save(entity));
    }

    public GroupeResponseDTO update(Long id, GroupeRequestDTO request) {
        Groupe entity = getEntity(id);
        if (repository.existsByFormationIdAndName(request.getFormationId(), request.getName())
                && !(entity.getFormation().getId().equals(request.getFormationId())
                && entity.getName().equals(request.getName()))) {
            throw new DuplicateResourceException("Groupe name already exists for this formation");
        }
        mapper.updateEntity(request, entity);
        entity.setFormation(getFormation(request.getFormationId()));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public GroupeResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<GroupeResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private Groupe getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Groupe not found with id: " + id));
    }

    private Formation getFormation(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation not found with id: " + id));
    }
}
