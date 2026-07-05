package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.entity.enums.CycleType;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
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
        AnneeUniversitaire annee = getAnnee(request.getAnneeUniversitaireId());
        Cycle cycle = getCycle(request.getCycleId());
        validateFiliereRequirement(cycle, request.getFiliereId());
        validateUniqueYearCycleName(request);

        Filiere filiere = resolveFiliere(request.getFiliereId());

        Formation entity = mapper.toEntity(request);

        entity.setAnneeUniversitaire(annee);
        entity.setCycle(cycle);
        entity.setFiliere(filiere);

        return mapper.toResponse(repository.save(entity));
    }

    public FormationResponseDTO update(Long id, FormationRequestDTO request) {

        Formation entity = getEntity(id);

        AnneeUniversitaire annee = getAnnee(request.getAnneeUniversitaireId());
        Cycle cycle = getCycle(request.getCycleId());
        validateFiliereRequirement(cycle, request.getFiliereId());
        validateUniqueYearCycleName(request, id);
        Filiere filiere = resolveFiliere(request.getFiliereId());

        mapper.updateEntity(request, entity);

        entity.setAnneeUniversitaire(annee);
        entity.setCycle(cycle);
        entity.setFiliere(filiere);

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

    private Filiere resolveFiliere(Long filiereId) {
        return filiereId == null ? null : getFiliere(filiereId);
    }

    private void validateFiliereRequirement(Cycle cycle, Long filiereId) {
        if (cycle.getType() == CycleType.PREPA && filiereId != null) {
            throw new IllegalArgumentException("PREPA cycle must not have filiere");
        }

        if (cycle.getType() != CycleType.PREPA && filiereId == null) {
            throw new IllegalArgumentException("Filiere is required for non-PREPA cycle");
        }
    }

    private void validateUniqueYearCycleName(FormationRequestDTO request) {
        if (repository.existsByAnneeUniversitaireIdAndCycleIdAndName(
                request.getAnneeUniversitaireId(),
                request.getCycleId(),
                request.getName()
        )) {
            throw duplicateFormation(request.getName());
        }
    }

    private void validateUniqueYearCycleName(FormationRequestDTO request, Long id) {
        if (repository.existsByAnneeUniversitaireIdAndCycleIdAndNameAndIdNot(
                request.getAnneeUniversitaireId(),
                request.getCycleId(),
                request.getName(),
                id
        )) {
            throw duplicateFormation(request.getName());
        }
    }

    private DuplicateResourceException duplicateFormation(String name) {
        return new DuplicateResourceException(
                "Formation already exists for the given year, cycle, and name: " + name
        );
    }
}
