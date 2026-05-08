package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.entity.structure.*;
import ma.eniad.userservice.exception.structure.DuplicateResourceException;
import ma.eniad.userservice.exception.structure.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.FormationMapper;
import ma.eniad.userservice.repository.structure.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional
public class FormationService {

    private final FormationRepository repository;
    private final AnneeUniversitaireRepository anneeRepository;
    private final FiliereRepository filiereRepository;
    private final CycleRepository cycleRepository;
    private final FormationMapper mapper;

    public FormationResponseDTO create(FormationRequestDTO request) {
        if (repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(
                request.getAnneeUniversitaireId(),
                request.getFiliereId(),
                request.getCycleId()
        )) {
            throw new DuplicateResourceException("Formation already exists for the given year, filiere, and cycle");
        }

        AnneeUniversitaire annee = getAnnee(request.getAnneeUniversitaireId());
        Cycle cycle = getCycle(request.getCycleId());

        if (cycle.getType().name().equals("PREPA") && request.getFiliereId() != null) {
            throw new IllegalArgumentException("PREPA cycle must not have filiere");
        }

        if (!cycle.getType().name().equals("PREPA") && request.getFiliereId() == null) {
            throw new IllegalArgumentException("Filiere is required for non-PREPA cycle");
        }

        Formation entity = mapper.toEntity(request);

        entity.setAnneeUniversitaire(annee);
        entity.setCycle(cycle);
        
        if (request.getFiliereId() != null) {
            entity.setFiliere(getFiliere(request.getFiliereId()));
        } else {
            entity.setFiliere(null);
        }

        return mapper.toResponse(repository.save(entity));
    }

    public FormationResponseDTO update(Long id, FormationRequestDTO request) {

        Formation entity = getEntity(id);

        boolean sameCombination = sameCombination(entity, request);
        if (!sameCombination && repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(
                request.getAnneeUniversitaireId(),
                request.getFiliereId(),
                request.getCycleId()
        )) {
            throw new DuplicateResourceException("Formation already exists for the given year, filiere, and cycle");
        }

        AnneeUniversitaire annee = getAnnee(request.getAnneeUniversitaireId());
        Cycle cycle = getCycle(request.getCycleId());

        if (cycle.getType().name().equals("PREPA") && request.getFiliereId() != null) {
            throw new IllegalArgumentException("PREPA cycle must not have filiere");
        }

        if (!cycle.getType().name().equals("PREPA") && request.getFiliereId() == null) {
            throw new IllegalArgumentException("Filiere is required");
        }

        mapper.updateEntity(request, entity);

        entity.setAnneeUniversitaire(annee);
        entity.setCycle(cycle);

        if (request.getFiliereId() != null) {
            entity.setFiliere(getFiliere(request.getFiliereId()));
        } else {
            entity.setFiliere(null);
        }

        return mapper.toResponse(repository.save(entity));
    }

    @Transactional(readOnly = true)
    public FormationResponseDTO getById(Long id) {
        return mapper.toResponse(getEntity(id));
    }

    @Transactional(readOnly = true)
    public List<FormationResponseDTO> getAll() {
        return repository.findAll().stream().map(mapper::toResponse).toList();
    }

    public void delete(Long id) {
        repository.delete(getEntity(id));
    }

    private Formation getEntity(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation not found with id: " + id));
    }

    private AnneeUniversitaire getAnnee(Long id) {
        return anneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Academic year not found with id: " + id));
    }

    private Filiere getFiliere(Long id) {
        return filiereRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Filiere not found with id: " + id));
    }

    private Cycle getCycle(Long id) {
        return cycleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Cycle not found with id: " + id));
    }

    private boolean sameCombination(Formation entity, FormationRequestDTO request) {
        return entity.getAnneeUniversitaire() != null
                && entity.getCycle() != null
                && safeEquals(entity.getAnneeUniversitaire().getId(), request.getAnneeUniversitaireId())
                && safeEquals(entity.getCycle().getId(), request.getCycleId())
                && safeEquals(getFiliereId(entity), request.getFiliereId());
    }

    private Long getFiliereId(Formation entity) {
        return entity.getFiliere() == null ? null : entity.getFiliere().getId();
    }

    private boolean safeEquals(Long left, Long right) {
        return left == null ? right == null : left.equals(right);
    }
}