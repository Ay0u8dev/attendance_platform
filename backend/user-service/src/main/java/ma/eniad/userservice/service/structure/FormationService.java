package ma.eniad.userservice.service.structure;

import java.util.List;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Cycle;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.structure.FormationMapper;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.CycleRepository;
import ma.eniad.userservice.repository.structure.FiliereRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
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
                request.getAnneeUniversitaireId(), request.getFiliereId(), request.getCycleId())) {
            throw new DuplicateResourceException("Formation already exists for the given year, filiere, and cycle");
        }
        Formation entity = mapper.toEntity(request);
        entity.setAnneeUniversitaire(getAnnee(request.getAnneeUniversitaireId()));
        entity.setFiliere(getFiliere(request.getFiliereId()));
        entity.setCycle(getCycle(request.getCycleId()));
        return mapper.toResponse(repository.save(entity));
    }

    public FormationResponseDTO update(Long id, FormationRequestDTO request) {
        Formation entity = getEntity(id);
        if (repository.existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(
                request.getAnneeUniversitaireId(), request.getFiliereId(), request.getCycleId())
                && !(entity.getAnneeUniversitaire().getId().equals(request.getAnneeUniversitaireId())
                && entity.getFiliere().getId().equals(request.getFiliereId())
                && entity.getCycle().getId().equals(request.getCycleId()))) {
            throw new DuplicateResourceException("Formation already exists for the given year, filiere, and cycle");
        }
        mapper.updateEntity(request, entity);
        entity.setAnneeUniversitaire(getAnnee(request.getAnneeUniversitaireId()));
        entity.setFiliere(getFiliere(request.getFiliereId()));
        entity.setCycle(getCycle(request.getCycleId()));
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
}
