package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.CycleRequestDTO;
import ma.eniad.userservice.dto.structure.CycleResponseDTO;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.exception.structure.DuplicateResourceException;
import ma.eniad.userservice.exception.structure.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.CycleMapper;
import ma.eniad.userservice.repository.structure.CycleRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class CycleService {

    private final CycleRepository repository;
    private final CycleMapper mapper;

    public CycleResponseDTO create(CycleRequestDTO request) {
        if (repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Cycle code already exists");
        }
        Cycle entity = mapper.toEntity(request);
        return mapper.toResponse(repository.save(entity));
    }

    public CycleResponseDTO update(Long id, CycleRequestDTO request) {
        Cycle entity = getEntity(id);
        if (!entity.getCode().equals(request.getCode()) && repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Cycle code already exists");
        }
        mapper.updateEntity(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public CycleResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<CycleResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private Cycle getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cycle not found with id: " + id));
    }
}
