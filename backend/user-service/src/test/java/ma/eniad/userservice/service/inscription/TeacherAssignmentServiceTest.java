package ma.eniad.userservice.service.inscription;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class TeacherAssignmentServiceTest {
    @Mock private TeacherAssignmentRepository assignmentRepository;
    @Mock private TeacherRepository teacherRepository;
    @Mock private AnneeUniversitaireRepository academicYearRepository;
    @Mock private FormationRepository formationRepository;
    @Mock private GroupeRepository groupeRepository;
    @Mock private ModuleRepository moduleRepository;
    @Mock private TeacherAssignmentMapper mapper;

    @InjectMocks
    private TeacherAssignmentService service;

    private TeacherAssignmentRequestDTO request;
    private Teacher teacher;
    private AnneeUniversitaire academicYear;
    private Formation formation;
    private Groupe groupe;
    private Module module;

    @BeforeEach
    void setUp() {
        request = new TeacherAssignmentRequestDTO();
        request.setTeacherId(1L);
        request.setAcademicYearId(2L);
        request.setFormationId(3L);
        request.setGroupeId(4L);
        request.setModuleId(5L);

        teacher = new Teacher();
        teacher.setId(1L);
        academicYear = org.mockito.Mockito.mock(AnneeUniversitaire.class);
        formation = org.mockito.Mockito.mock(Formation.class);
        groupe = org.mockito.Mockito.mock(Groupe.class);
        module = org.mockito.Mockito.mock(Module.class);

        when(academicYear.getId()).thenReturn(2L);
        when(formation.getId()).thenReturn(3L);
        when(formation.getAnneeUniversitaire()).thenReturn(academicYear);
        when(groupe.getFormation()).thenReturn(formation);
        when(module.getFormation()).thenReturn(formation);

        when(teacherRepository.findById(1L)).thenReturn(Optional.of(teacher));
        when(academicYearRepository.findById(2L)).thenReturn(Optional.of(academicYear));
        when(formationRepository.findById(3L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(4L)).thenReturn(Optional.of(groupe));
        when(moduleRepository.findById(5L)).thenReturn(Optional.of(module));
    }

    @Test
    void createsAssignmentWhenRelationsAreValid() {
        TeacherAssignment assignment = new TeacherAssignment();
        TeacherAssignmentResponseDTO response = TeacherAssignmentResponseDTO.builder().id(10L).build();
        when(mapper.toEntity(request)).thenReturn(assignment);
        when(assignmentRepository.save(assignment)).thenReturn(assignment);
        when(mapper.toResponse(assignment)).thenReturn(response);

        TeacherAssignmentResponseDTO result = service.create(request);

        assertThat(result.getId()).isEqualTo(10L);
        assertThat(assignment.getTeacher()).isSameAs(teacher);
        assertThat(assignment.getAcademicYear()).isSameAs(academicYear);
        assertThat(assignment.getFormation()).isSameAs(formation);
        assertThat(assignment.getGroupe()).isSameAs(groupe);
        assertThat(assignment.getModule()).isSameAs(module);
    }

    @Test
    void rejectsDuplicateAssignmentOnCreate() {
        when(assignmentRepository.existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleId(
            1L, 2L, 3L, 4L, 5L
        )).thenReturn(true);

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(DuplicateResourceException.class);

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void rejectsFormationFromDifferentAcademicYear() {
        AnneeUniversitaire otherYear = org.mockito.Mockito.mock(AnneeUniversitaire.class);
        when(otherYear.getId()).thenReturn(99L);
        when(formation.getAnneeUniversitaire()).thenReturn(otherYear);

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(InvalidInputException.class)
            .hasMessageContaining("academic year");

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void rejectsGroupeFromDifferentFormation() {
        Formation otherFormation = org.mockito.Mockito.mock(Formation.class);
        when(otherFormation.getId()).thenReturn(99L);
        when(groupe.getFormation()).thenReturn(otherFormation);

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(InvalidInputException.class)
            .hasMessage("Groupe does not belong to the selected formation");

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void rejectsModuleFromDifferentFormation() {
        Formation otherFormation = org.mockito.Mockito.mock(Formation.class);
        when(otherFormation.getId()).thenReturn(99L);
        when(module.getFormation()).thenReturn(otherFormation);

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(InvalidInputException.class)
            .hasMessage("Module does not belong to the selected formation");

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void createThrowsWhenTeacherMissing() {
        when(teacherRepository.findById(1L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.create(request))
            .isInstanceOf(ResourceNotFoundException.class)
            .hasMessage("Teacher not found with id: 1");
    }

    @Test
    void updateExcludesCurrentAssignmentFromDuplicateCheck() {
        TeacherAssignment assignment = new TeacherAssignment();
        assignment.setId(10L);
        TeacherAssignmentResponseDTO response = TeacherAssignmentResponseDTO.builder().id(10L).build();
        when(assignmentRepository.findById(10L)).thenReturn(Optional.of(assignment));
        when(assignmentRepository.save(assignment)).thenReturn(assignment);
        when(mapper.toResponse(assignment)).thenReturn(response);

        TeacherAssignmentResponseDTO result = service.update(10L, request);

        assertThat(result.getId()).isEqualTo(10L);
        verify(assignmentRepository)
            .existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleIdAndIdNot(
                1L, 2L, 3L, 4L, 5L, 10L
            );
    }

    @Test
    void updateRejectsDuplicateAssignment() {
        TeacherAssignment assignment = new TeacherAssignment();
        assignment.setId(10L);
        when(assignmentRepository.findById(10L)).thenReturn(Optional.of(assignment));
        when(assignmentRepository.existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleIdAndIdNot(
            1L, 2L, 3L, 4L, 5L, 10L
        )).thenReturn(true);

        assertThatThrownBy(() -> service.update(10L, request))
            .isInstanceOf(DuplicateResourceException.class)
            .hasMessage("Teacher assignment already exists for the selected teacher, academic year, formation, groupe and module");

        verify(assignmentRepository, never()).save(any());
    }

    @Test
    void getByIdReturnsMappedAssignment() {
        TeacherAssignment assignment = new TeacherAssignment();
        TeacherAssignmentResponseDTO response = TeacherAssignmentResponseDTO.builder().id(10L).build();

        when(assignmentRepository.findById(10L)).thenReturn(Optional.of(assignment));
        when(mapper.toResponse(assignment)).thenReturn(response);

        assertThat(service.getById(10L)).isSameAs(response);
    }

    @Test
    void getAllReturnsMappedAssignments() {
        TeacherAssignment first = new TeacherAssignment();
        TeacherAssignment second = new TeacherAssignment();
        TeacherAssignmentResponseDTO firstResponse = TeacherAssignmentResponseDTO.builder().id(10L).build();
        TeacherAssignmentResponseDTO secondResponse = TeacherAssignmentResponseDTO.builder().id(11L).build();

        when(assignmentRepository.findAll()).thenReturn(List.of(first, second));
        when(mapper.toResponse(first)).thenReturn(firstResponse);
        when(mapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(service.getAll()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void deleteRemovesAssignment() {
        TeacherAssignment assignment = new TeacherAssignment();

        when(assignmentRepository.findById(10L)).thenReturn(Optional.of(assignment));

        service.delete(10L);

        verify(assignmentRepository).delete(assignment);
    }
}
