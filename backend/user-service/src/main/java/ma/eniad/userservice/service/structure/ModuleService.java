package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.ModuleRequestDTO;
import ma.eniad.userservice.dto.structure.ModuleResponseDTO;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.ModuleMapper;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class ModuleService {

    private final ModuleRepository repository;
    private final FormationRepository formationRepository;
    private final ModuleMapper mapper;

    public ModuleResponseDTO create(ModuleRequestDTO request) {
        if (repository.existsByFormationIdAndCode(request.getFormationId(), request.getCode())) {
            throw new DuplicateResourceException("Module code already exists for this formation");
        }
        Module entity = mapper.toEntity(request);
        entity.setFormation(getFormation(request.getFormationId()));
        return mapper.toResponse(repository.save(entity));
    }

    public ModuleResponseDTO update(Long id, ModuleRequestDTO request) {
        Module entity = getEntity(id);
        if (repository.existsByFormationIdAndCode(request.getFormationId(), request.getCode())
                && !(entity.getFormation().getId().equals(request.getFormationId())
                && entity.getCode().equals(request.getCode()))) {
            throw new DuplicateResourceException("Module code already exists for this formation");
        }
        mapper.updateEntity(request, entity);
        entity.setFormation(getFormation(request.getFormationId()));
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public ModuleResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<ModuleResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private Module getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Module not found with id: " + id));
    }

    private Formation getFormation(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation not found with id: " + id));
    }
}
