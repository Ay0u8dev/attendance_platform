package ma.eniad.userservice.service.inscription;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.inscription.StudentInscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.StudentInscriptionResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.inscription.StudentInscriptionMapper;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.student.StudentRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true) 
public class StudentInscriptionService {

    private final StudentInscriptionRepository inscriptionRepository;
    private final StudentRepository studentRepository;
    private final FormationRepository formationRepository;
    private final GroupeRepository groupeRepository;
    private final AnneeUniversitaireRepository anneeRepository;
    private final StudentInscriptionMapper inscriptionMapper;

    // Create Inscription
    @Transactional
    public StudentInscriptionResponseDTO createInscription(StudentInscriptionRequestDTO request) {
        Student student = findStudent(request.getStudentId());
        Formation formation = findFormation(request.getFormationId());  
        Groupe groupe = findGroupe(request.getGroupeId());
        AnneeUniversitaire annee = findYear(request.getAcademicYearId());
        
        if (inscriptionRepository.existsByStudentIdAndAnneeUniversitaireId(student.getId(), annee.getId())) {
            throw new DuplicateResourceException("Student is already enrolled in an academic year");
        }

        if (!groupeBelongsToFormation(groupe, formation)) {
            throw new IllegalArgumentException("Groupe does not belong to the formation");
        }

        Inscription inscription = inscriptionMapper.toEntity(request);
        inscription.setStudent(student);
        inscription.setFormation(formation);
        inscription.setGroupe(groupe);
        inscription.setAnneeUniversitaire(annee);

        Inscription savedInscription = inscriptionRepository.save(inscription);
        return inscriptionMapper.toResponse(savedInscription);
    }
    
    // Get Inscription by ID
    public StudentInscriptionResponseDTO getInscriptionById(Long id) {
        Inscription inscription = findInscription(id);
        return inscriptionMapper.toResponse(inscription);
    }

    // Get all Inscriptions
    public List<StudentInscriptionResponseDTO> getAllInscriptions() {
        return inscriptionRepository.findAll().stream()
                .map(inscriptionMapper::toResponse)
                .toList();
    }

    // Update Inscription
    @Transactional
    public StudentInscriptionResponseDTO updateInscription(Long id, StudentInscriptionRequestDTO request) {
        Inscription inscription = findInscription(id);

        // Resolve related entities
        Student student = findStudent(request.getStudentId());
        Formation formation = findFormation(request.getFormationId());  
        Groupe groupe = findGroupe(request.getGroupeId());
        AnneeUniversitaire annee = findYear(request.getAcademicYearId());

        // Check for duplicate enrollment (skip if same student+year)
        if (!inscription.getStudent().getId().equals(student.getId()) 
                || !inscription.getAnneeUniversitaire().getId().equals(annee.getId())) {
            if (inscriptionRepository.existsByStudentIdAndAnneeUniversitaireId(student.getId(), annee.getId())) {
                throw new DuplicateResourceException("Student is already enrolled in an academic year");
            }
        }

        // Validate groupe-formation relationship
        if (!groupeBelongsToFormation(groupe, formation)) {
            throw new IllegalArgumentException("Groupe does not belong to the formation");
        }

        // Update entity
        inscriptionMapper.updateEntity(request, inscription);
        inscription.setStudent(student);
        inscription.setFormation(formation);
        inscription.setGroupe(groupe);
        inscription.setAnneeUniversitaire(annee);

        Inscription updatedInscription = inscriptionRepository.save(inscription);
        return inscriptionMapper.toResponse(updatedInscription);
    }

    // Delete Inscription
    @Transactional
    public void deleteInscription(Long id) {
        Inscription inscription = findInscription(id);
        inscriptionRepository.delete(inscription);
    }
    
    // HELPERS (clean separation)
    private Student findStudent(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
    }

    private Formation findFormation(Long id) {
        return formationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Formation not found"));
    }

    private Groupe findGroupe(Long id) {
        return groupeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Groupe not found"));
    }

    private AnneeUniversitaire findYear(Long id) {
        return anneeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Academic year not found"));
    }

    private Inscription findInscription(Long id) {
        return inscriptionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Inscription not found"));
    }

    // BUSINESS RULE
    private boolean groupeBelongsToFormation(Groupe groupe, Formation formation) {
        return groupe.getFormation() != null
                && groupe.getFormation().getId().equals(formation.getId());
    }
}
