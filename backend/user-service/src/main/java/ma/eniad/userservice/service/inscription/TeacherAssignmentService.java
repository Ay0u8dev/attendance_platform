package ma.eniad.userservice.service.inscription;

import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentRequestDTO;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentResponseDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidInputException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.inscription.TeacherAssignmentMapper;
import ma.eniad.userservice.repository.inscription.TeacherAssignmentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.structure.ModuleRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherAssignmentService {
    private final TeacherAssignmentRepository assignmentRepository;
    private final TeacherRepository teacherRepository;
    private final AnneeUniversitaireRepository academicYearRepository;
    private final FormationRepository formationRepository;
    private final GroupeRepository groupeRepository;
    private final ModuleRepository moduleRepository;
    private final TeacherAssignmentMapper mapper;

    @Transactional
    public TeacherAssignmentResponseDTO create(TeacherAssignmentRequestDTO request) {
        AssignmentRelations relations = resolveAndValidateRelations(request);
        ensureNotDuplicate(request);

        TeacherAssignment assignment = mapper.toEntity(request);
        applyRelations(assignment, relations);
        return mapper.toResponse(assignmentRepository.save(assignment));
    }

    @Transactional
    public TeacherAssignmentResponseDTO update(Long id, TeacherAssignmentRequestDTO request) {
        TeacherAssignment assignment = findAssignment(id);
        AssignmentRelations relations = resolveAndValidateRelations(request);
        ensureNotDuplicate(request, id);

        mapper.updateEntity(request, assignment);
        applyRelations(assignment, relations);
        return mapper.toResponse(assignmentRepository.save(assignment));
    }

    public TeacherAssignmentResponseDTO getById(Long id) {
        return mapper.toResponse(findAssignment(id));
    }

    public List<TeacherAssignmentResponseDTO> getAll() {
        return assignmentRepository.findAll().stream()
            .map(mapper::toResponse)
            .toList();
    }

    @Transactional
    public void delete(Long id) {
        assignmentRepository.delete(findAssignment(id));
    }

    private AssignmentRelations resolveAndValidateRelations(TeacherAssignmentRequestDTO request) {
        Teacher teacher = teacherRepository.findById(request.getTeacherId())
            .orElseThrow(() -> notFound("Teacher", request.getTeacherId()));
        AnneeUniversitaire academicYear = academicYearRepository.findById(request.getAcademicYearId())
            .orElseThrow(() -> notFound("Academic year", request.getAcademicYearId()));
        Formation formation = formationRepository.findById(request.getFormationId())
            .orElseThrow(() -> notFound("Formation", request.getFormationId()));
        Groupe groupe = groupeRepository.findById(request.getGroupeId())
            .orElseThrow(() -> notFound("Groupe", request.getGroupeId()));
        Module module = moduleRepository.findById(request.getModuleId())
            .orElseThrow(() -> notFound("Module", request.getModuleId()));

        validateRelationships(academicYear, formation, groupe, module);
        return new AssignmentRelations(teacher, academicYear, formation, groupe, module);
    }

    private void validateRelationships(AnneeUniversitaire academicYear,
                                       Formation formation,
                                       Groupe groupe,
                                       Module module) {
        if (formation.getAnneeUniversitaire() == null
            || !formation.getAnneeUniversitaire().getId().equals(academicYear.getId())) {
            throw new InvalidInputException("Formation does not belong to the selected academic year");
        }
        if (groupe.getFormation() == null
            || !groupe.getFormation().getId().equals(formation.getId())) {
            throw new InvalidInputException("Groupe does not belong to the selected formation");
        }
        if (module.getFormation() == null
            || !module.getFormation().getId().equals(formation.getId())) {
            throw new InvalidInputException("Module does not belong to the selected formation");
        }
    }

    private void ensureNotDuplicate(TeacherAssignmentRequestDTO request) {
        if (assignmentRepository.existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleId(
            request.getTeacherId(),
            request.getAcademicYearId(),
            request.getFormationId(),
            request.getGroupeId(),
            request.getModuleId()
        )) {
            throw duplicateAssignment();
        }
    }

    private void ensureNotDuplicate(TeacherAssignmentRequestDTO request, Long assignmentId) {
        if (assignmentRepository.existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleIdAndIdNot(
            request.getTeacherId(),
            request.getAcademicYearId(),
            request.getFormationId(),
            request.getGroupeId(),
            request.getModuleId(),
            assignmentId
        )) {
            throw duplicateAssignment();
        }
    }

    private void applyRelations(TeacherAssignment assignment, AssignmentRelations relations) {
        assignment.setTeacher(relations.teacher);
        assignment.setAcademicYear(relations.academicYear);
        assignment.setFormation(relations.formation);
        assignment.setGroupe(relations.groupe);
        assignment.setModule(relations.module);
    }

    private TeacherAssignment findAssignment(Long id) {
        return assignmentRepository.findById(id)
            .orElseThrow(() -> notFound("Teacher assignment", id));
    }

    private ResourceNotFoundException notFound(String resource, Long id) {
        return new ResourceNotFoundException(resource + " not found with id: " + id);
    }

    private DuplicateResourceException duplicateAssignment() {
        return new DuplicateResourceException(
            "Teacher assignment already exists for the selected teacher, academic year, formation, groupe and module"
        );
    }

    @RequiredArgsConstructor
    private static final class AssignmentRelations {
        private final Teacher teacher;
        private final AnneeUniversitaire academicYear;
        private final Formation formation;
        private final Groupe groupe;
        private final Module module;
    }
}
