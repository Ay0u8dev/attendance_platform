package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.AnneeRequestDTO;
import ma.eniad.userservice.dto.structure.AnneeResponseDTO;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.exception.structure.DuplicateResourceException;
import ma.eniad.userservice.exception.structure.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.AnneeUniversitaireMapper;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class AnneeUniversitaireService {

    private final AnneeUniversitaireRepository repository;
    private final AnneeUniversitaireMapper mapper;

    public AnneeResponseDTO create(AnneeRequestDTO request) {
        if (repository.existsByName(request.getName())) {
            throw new DuplicateResourceException("Academic year name already exists");
        }
        AnneeUniversitaire entity = mapper.toEntity(request);
        return mapper.toResponse(repository.save(entity));
    }

    public AnneeResponseDTO update(Long id, AnneeRequestDTO request) {
        AnneeUniversitaire entity = getEntity(id);
        if (!entity.getName().equals(request.getName()) && repository.existsByName(request.getName())) {
            throw new DuplicateResourceException("Academic year name already exists");
        }
        mapper.updateEntity(request, entity);
        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public AnneeResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<AnneeResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private AnneeUniversitaire getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Academic year not found with id: " + id));
    }
}
