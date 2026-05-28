package ma.eniad.userservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Optional;

import ma.eniad.userservice.dto.inscription.InscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.InscriptionResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.inscription.InscriptionMapper;
import ma.eniad.userservice.repository.inscription.InscriptionRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.FormationRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.service.inscription.InscriptionService;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

@ExtendWith(MockitoExtension.class)
class InscriptionServiceTest {

    @Mock
    private InscriptionRepository inscriptionRepository;

    @Mock
    private StudentRepository studentRepository;

    @Mock
    private FormationRepository formationRepository;

    @Mock
    private GroupeRepository groupeRepository;

    @Mock
    private AnneeUniversitaireRepository anneeRepository;

    @Mock
    private InscriptionMapper inscriptionMapper;

    @InjectMocks
    private InscriptionService inscriptionService;

    @Test
    void createLinksEntitiesAndReturnsResponse() {
        InscriptionRequestDTO request = request(1L, 2L, 3L, 4L);
        Student student = Student.builder().id(1L).build();
        Formation formation = Formation.builder().id(2L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(formation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();
        Inscription inscription = new Inscription();
        InscriptionResponseDTO response = response(10L, 1L, 2L, 3L, 4L);

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));
        when(inscriptionMapper.toEntity(request)).thenReturn(inscription);
        when(inscriptionRepository.save(inscription)).thenReturn(inscription);
        when(inscriptionMapper.toResponse(inscription)).thenReturn(response);

        InscriptionResponseDTO result = inscriptionService.createInscription(request);

        assertThat(result).isSameAs(response);
        assertThat(inscription.getStudent()).isSameAs(student);
        assertThat(inscription.getFormation()).isSameAs(formation);
        assertThat(inscription.getGroupe()).isSameAs(groupe);
        assertThat(inscription.getAnneeUniversitaire()).isSameAs(annee);
        verify(inscriptionRepository).save(inscription);
    }

    @Test
    void createThrowsWhenStudentAlreadyEnrolled() {
        InscriptionRequestDTO request = request(1L, 2L, 3L, 4L);
        Student student = Student.builder().id(1L).build();
        Formation formation = Formation.builder().id(2L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(formation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));
        when(inscriptionRepository.existsByStudentIdAndAnneeUniversitaireId(1L, 4L)).thenReturn(true);

        assertThatThrownBy(() -> inscriptionService.createInscription(request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Student is already enrolled in an academic year");
    }

    @Test
    void createThrowsWhenGroupeDoesNotBelongToFormation() {
        InscriptionRequestDTO request = request(1L, 2L, 3L, 4L);
        Student student = Student.builder().id(1L).build();
        Formation formation = Formation.builder().id(2L).build();
        Formation otherFormation = Formation.builder().id(99L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(otherFormation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();

        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));

        assertThatThrownBy(() -> inscriptionService.createInscription(request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Groupe does not belong to the formation");
    }

    @Test
    void getInscriptionByIdReturnsResponse() {
        Inscription inscription = new Inscription();
        InscriptionResponseDTO response = response(10L, 1L, 2L, 3L, 4L);

        when(inscriptionRepository.findById(10L)).thenReturn(Optional.of(inscription));
        when(inscriptionMapper.toResponse(inscription)).thenReturn(response);

        assertThat(inscriptionService.getInscriptionById(10L)).isSameAs(response);
    }

    @Test
    void getInscriptionByIdThrowsWhenMissing() {
        when(inscriptionRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.getInscriptionById(10L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Inscription not found");
    }

    @Test
    void getAllInscriptionsMapsAllEntities() {
        Inscription first = new Inscription();
        Inscription second = new Inscription();
        InscriptionResponseDTO firstResponse = response(10L, 1L, 2L, 3L, 4L);
        InscriptionResponseDTO secondResponse = response(11L, 5L, 6L, 7L, 8L);

        when(inscriptionRepository.findAll()).thenReturn(List.of(first, second));
        when(inscriptionMapper.toResponse(first)).thenReturn(firstResponse);
        when(inscriptionMapper.toResponse(second)).thenReturn(secondResponse);

        assertThat(inscriptionService.getAllInscriptions()).containsExactly(firstResponse, secondResponse);
    }

    @Test
    void updateUpdatesInscriptionWithoutDuplicateCheckWhenSameStudentAndYear() {
        InscriptionRequestDTO request = request(1L, 2L, 3L, 4L);
        Student student = Student.builder().id(1L).build();
        Formation formation = Formation.builder().id(2L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(formation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();

        Inscription inscription = new Inscription();
        inscription.setId(10L);
        inscription.setStudent(student);
        inscription.setFormation(formation);
        inscription.setGroupe(groupe);
        inscription.setAnneeUniversitaire(annee);

        InscriptionResponseDTO response = response(10L, 1L, 2L, 3L, 4L);

        when(inscriptionRepository.findById(10L)).thenReturn(Optional.of(inscription));
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));
        when(inscriptionRepository.save(inscription)).thenReturn(inscription);
        when(inscriptionMapper.toResponse(inscription)).thenReturn(response);

        InscriptionResponseDTO result = inscriptionService.updateInscription(10L, request);

        assertThat(result).isSameAs(response);
        verify(inscriptionMapper).updateEntity(request, inscription);
        verify(inscriptionRepository, never())
                .existsByStudentIdAndAnneeUniversitaireId(1L, 4L);
    }

    @Test
    void updateThrowsWhenStudentAlreadyEnrolledInYear() {
        InscriptionRequestDTO request = request(2L, 2L, 3L, 4L);
        Student existingStudent = Student.builder().id(1L).build();
        Student newStudent = Student.builder().id(2L).build();
        Formation formation = Formation.builder().id(2L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(formation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();

        Inscription inscription = new Inscription();
        inscription.setId(10L);
        inscription.setStudent(existingStudent);
        inscription.setAnneeUniversitaire(annee);

        when(inscriptionRepository.findById(10L)).thenReturn(Optional.of(inscription));
        when(studentRepository.findById(2L)).thenReturn(Optional.of(newStudent));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));
        when(inscriptionRepository.existsByStudentIdAndAnneeUniversitaireId(2L, 4L)).thenReturn(true);

        assertThatThrownBy(() -> inscriptionService.updateInscription(10L, request))
                .isInstanceOf(DuplicateResourceException.class)
                .hasMessage("Student is already enrolled in an academic year");
    }

    @Test
    void updateThrowsWhenGroupeDoesNotBelongToFormation() {
        InscriptionRequestDTO request = request(1L, 2L, 3L, 4L);
        Student student = Student.builder().id(1L).build();
        Formation formation = Formation.builder().id(2L).build();
        Formation otherFormation = Formation.builder().id(99L).build();
        Groupe groupe = Groupe.builder().id(3L).formation(otherFormation).build();
        AnneeUniversitaire annee = AnneeUniversitaire.builder().id(4L).build();

        Inscription inscription = new Inscription();
        inscription.setId(10L);
        inscription.setStudent(student);
        inscription.setAnneeUniversitaire(annee);

        when(inscriptionRepository.findById(10L)).thenReturn(Optional.of(inscription));
        when(studentRepository.findById(1L)).thenReturn(Optional.of(student));
        when(formationRepository.findById(2L)).thenReturn(Optional.of(formation));
        when(groupeRepository.findById(3L)).thenReturn(Optional.of(groupe));
        when(anneeRepository.findById(4L)).thenReturn(Optional.of(annee));

        assertThatThrownBy(() -> inscriptionService.updateInscription(10L, request))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Groupe does not belong to the formation");
    }

    @Test
    void updateThrowsWhenInscriptionMissing() {
        when(inscriptionRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.updateInscription(10L, request(1L, 2L, 3L, 4L)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Inscription not found");
    }

    @Test
    void deleteRemovesInscription() {
        Inscription inscription = new Inscription();

        when(inscriptionRepository.findById(10L)).thenReturn(Optional.of(inscription));

        inscriptionService.deleteInscription(10L);

        verify(inscriptionRepository).delete(inscription);
    }

    @Test
    void deleteThrowsWhenInscriptionMissing() {
        when(inscriptionRepository.findById(10L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> inscriptionService.deleteInscription(10L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Inscription not found");
    }

    private static InscriptionRequestDTO request(Long studentId, Long formationId, Long groupeId, Long yearId) {
        InscriptionRequestDTO request = new InscriptionRequestDTO();
        request.setStudentId(studentId);
        request.setFormationId(formationId);
        request.setGroupeId(groupeId);
        request.setAcademicYearId(yearId);
        return request;
    }

    private static InscriptionResponseDTO response(Long id, Long studentId, Long formationId, Long groupeId, Long yearId) {
        return InscriptionResponseDTO.builder()
                .id(id)
                .studentId(studentId)
                .formationId(formationId)
                .groupeId(groupeId)
                .academicYearId(yearId)
                .build();
    }
}
