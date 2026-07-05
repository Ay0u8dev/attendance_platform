package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.FiliereRequestDTO;
import ma.eniad.userservice.dto.structure.FiliereResponseDTO;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.FiliereMapper;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FiliereService {

    private final FiliereRepository repository;
    private final FiliereMapper mapper;

    public FiliereResponseDTO create(FiliereRequestDTO request) {
        if (repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Filiere code already exists");
        }
        Filiere entity = mapper.toEntity(request);
        return mapper.toResponse(repository.save(entity));
    }

    public FiliereResponseDTO update(Long id, FiliereRequestDTO request) {
        Filiere entity = getEntity(id);
        if (!entity.getCode().equals(request.getCode()) && repository.existsByCode(request.getCode())) {
            throw new DuplicateResourceException("Filiere code already exists");
        }
        mapper.updateEntity(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public FiliereResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<FiliereResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private Filiere getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere not found with id: " + id));
    }
}
