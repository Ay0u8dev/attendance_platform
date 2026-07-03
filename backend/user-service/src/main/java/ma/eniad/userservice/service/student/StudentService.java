package ma.eniad.userservice.service.student;

import java.util.HashSet;
import java.util.List;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.UUID;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.student.StudentProfileDto;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.InvalidInputException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.structure.GroupeRepository;
import ma.eniad.userservice.service.UserContext;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final StudentInscriptionRepository inscriptionRepository;
    private final AnneeUniversitaireRepository anneeUniversitaireRepository;
    private final GroupeRepository groupeRepository;
    private final StudentMapper      studentMapper;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------
    
    @Transactional
    public StudentResponseDTO create(StudentRequestDTO request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        request.setEmail(normalizedEmail);
        validateEmailDomain(normalizedEmail);
        String normalizedApogee = normalizeApogee(request.getNumApogee());
        request.setNumApogee(normalizedApogee);


        Student student = studentMapper.toEntity(request);
        if (student.getRoles() == null) {
            student.setRoles(new HashSet<>());
        }
        student.getRoles().add(Role.STUDENT);
        applyAccountState(request, student, true, true);
        try {
            StudentResponseDTO dto = studentMapper.toResponse(studentRepository.save(student));
            populateEnrollmentDetails(dto);
            return dto;
        } catch (DataIntegrityViolationException ex) {
            if (normalizedEmail != null && userRepository.existsByEmail(normalizedEmail)) {
                throw new DuplicateResourceException("Email already exists");
            }
            if (normalizedApogee != null && studentRepository.existsByNumApogee(normalizedApogee)) {
                throw new DuplicateResourceException("NumApogee already exists");
            }
            throw ex;
        }
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------
    public StudentResponseDTO getById(Long id) {
        StudentResponseDTO dto = studentMapper.toResponse(findStudentById(id));
        populateEnrollmentDetails(dto);
        return dto;
    }

    public List<StudentResponseDTO> getAll() {
        List<StudentResponseDTO> dtos = studentRepository.findAll().stream()
                .map(studentMapper::toResponse)
                .toList();
        populateEnrollmentDetails(dtos);
        return dtos;
    }

    public List<StudentResponseDTO> getByGroupeId(Long groupeId) {
        if (!groupeRepository.existsById(groupeId)) {
            throw new ResourceNotFoundException("Groupe not found");
        }

        List<StudentResponseDTO> dtos = studentRepository.findByGroupeId(groupeId).stream()
                .map(studentMapper::toResponse)
                .toList();
        populateEnrollmentDetails(dtos);
        return dtos;
    }

    public StudentProfileDto getCurrentProfile() {
        return buildCurrentProfile(findCurrentStudent());
    }

    @Transactional
    public StudentProfileDto updateCurrentProfilePhoto(String pfpUrl) {
        Student student = findCurrentStudent();
        student.setPfpUrl(pfpUrl);
        studentRepository.save(student);
        return buildCurrentProfile(student);
    }

    private Student findCurrentStudent() {
        UserContext.UserInfo context = UserContext.getCurrentUser();
        if (context == null || context.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user context");
        }

        Long studentId;
        try {
            studentId = Long.parseLong(context.getUserId());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user id");
        }

        return studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
    }

    private StudentProfileDto buildCurrentProfile(Student student) {
        StudentProfileDto.StudentProfileDtoBuilder builder = StudentProfileDto.builder()
                .id(student.getId())
                .email(student.getEmail())
                .firstName(student.getFirstName())
                .lastName(student.getLastName())
                .pfpUrl(student.getPfpUrl())
                .numApogee(student.getNumApogee())
                .faceEnrolled(student.getFaceEnrolledAt() != null)
                .faceEnrolledAt(student.getFaceEnrolledAt());

        applyEnrollmentDetails(builder, student);

        return builder.build();
    }

    // -------------------------------------------------------------------------
    // Update
    @Transactional
    public StudentResponseDTO update(Long id, StudentRequestDTO request) {
        Student student = findStudentById(id);

        if (request.getEmail() != null) {
            String normalizedEmail = normalizeEmail(request.getEmail());
            request.setEmail(normalizedEmail);
            validateEmailDomain(normalizedEmail);
        }
        if (request.getNumApogee() != null) {
            String normalizedApogee = normalizeApogee(request.getNumApogee());
            request.setNumApogee(normalizedApogee);
        }

        studentMapper.updateEntity(request, student);
        applyAccountState(request, student, student.isEnabled(), student.isFirstLogin());
        try {
            StudentResponseDTO dto = studentMapper.toResponse(studentRepository.save(student));
            populateEnrollmentDetails(dto);
            return dto;
        } catch (DataIntegrityViolationException ex) {
            if (request.getEmail() != null) {
                userRepository.findByEmail(request.getEmail())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException("Email already exists");
                    });
            }

            if (request.getNumApogee() != null &&
                studentRepository.existsByNumApogeeAndIdNot(request.getNumApogee(), id)) {
                throw new DuplicateResourceException("NumApogee already exists");
            }

            throw ex;
        }
    }

    // -------------------------------------------------------------------------
    // Delete
    @Transactional
    public void delete(Long id) {
        Student student = findStudentById(id);
        studentRepository.delete(student);
    }
    
    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Student findStudentById(Long id) {
        return studentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));
    }



    private void applyEnrollmentDetails(StudentProfileDto.StudentProfileDtoBuilder builder, Student student) {
        List<AnneeUniversitaire> activeYears = anneeUniversitaireRepository.findByActiveTrue();
        if (activeYears.isEmpty()) {
            return;
        }

        Long activeYearId = activeYears.get(0).getId();
        Inscription inscription = inscriptionRepository
                .findActiveByStudentIdAndYearId(student.getId(), activeYearId)
                .orElse(null);
        if (inscription == null) {
            return;
        }

        builder.academicYear(activeYears.get(0).getName());

        Groupe groupe = inscription.getGroupe();
        if (groupe != null) {
            builder.groupe(groupe.getName());

            Formation formation = groupe.getFormation();
            if (formation != null) {
                if (formation.getCycle() != null) {
                    builder.cycle(formation.getCycle().getName());
                }

                Filiere filiere = formation.getFiliere();
                if (filiere != null) {
                    builder.filiere(filiere.getCode());
                }
            }
        }
    }

    private void validateEmailDomain(String email) {
        if (email == null) {
            return;
        }

        String normalizedEmail = email.trim().toLowerCase();
        String normalizedDomain = normalizeDomain(allowedDomain);

        if (!normalizedDomain.isEmpty() && !normalizedEmail.endsWith("@" + normalizedDomain)) {
            throw new InvalidDomainException("Email must be in the @" + normalizedDomain + " domain");
        }
    }

    private String normalizeDomain(String domain) {
        if (domain == null) {
            return "";
        }

        String normalized = domain.trim().toLowerCase();
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    private String normalizeApogee(String numApogee) {
        if (numApogee == null) {
            return null;
        }

        return numApogee.trim();
    }

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }

        return email.trim().toLowerCase();
    }

    private void applyAccountState(StudentRequestDTO request,
                                   Student student,
                                   boolean defaultEnabled,
                                   boolean defaultFirstLogin) {
        boolean enabled = request.getEnabled() == null ? defaultEnabled : request.getEnabled();
        boolean firstLogin = request.getFirstLogin() == null ? defaultFirstLogin : request.getFirstLogin();

        student.setEnabled(enabled);
        student.setFirstLogin(enabled && firstLogin);
    }

    private void populateEnrollmentDetails(StudentResponseDTO dto) {
        if (dto == null) {
            return;
        }
        List<AnneeUniversitaire> activeYears = anneeUniversitaireRepository.findByActiveTrue();
        if (activeYears == null || activeYears.isEmpty()) {
            return;
        }
        Long activeYearId = activeYears.get(0).getId();
        inscriptionRepository.findActiveByStudentIdAndYearId(dto.getId(), activeYearId)
                .ifPresent(inscription -> applyEnrollmentDetails(dto, inscription));
    }

    private void populateEnrollmentDetails(List<StudentResponseDTO> dtos) {
        if (dtos == null || dtos.isEmpty()) {
            return;
        }
        List<AnneeUniversitaire> activeYears = anneeUniversitaireRepository.findByActiveTrue();
        if (activeYears == null || activeYears.isEmpty()) {
            return;
        }
        Long activeYearId = activeYears.get(0).getId();
        List<Inscription> inscriptions = inscriptionRepository.findActiveByYearId(activeYearId);
        if (inscriptions == null) {
            return;
        }
        java.util.Map<Long, Inscription> studentEnrollmentMap = inscriptions.stream()
                .filter(i -> i.getStudent() != null)
                .collect(java.util.stream.Collectors.toMap(
                        i -> i.getStudent().getId(),
                        i -> i,
                        (existing, replacement) -> existing
                ));

        for (StudentResponseDTO dto : dtos) {
            applyEnrollmentDetails(dto, studentEnrollmentMap.get(dto.getId()));
        }
    }

    private void applyEnrollmentDetails(StudentResponseDTO dto, Inscription inscription) {
        if (dto == null || inscription == null) {
            return;
        }

        AnneeUniversitaire academicYear = inscription.getAnneeUniversitaire();
        if (academicYear != null) {
            dto.setAcademicYear(academicYear.getName());
        }

        Groupe groupe = inscription.getGroupe();
        if (groupe != null) {
            dto.setGroupeName(groupe.getName());
        }

        Formation formation = inscription.getFormation();
        if (formation == null && groupe != null) {
            formation = groupe.getFormation();
        }
        if (formation == null) {
            return;
        }

        if (formation.getCycle() != null) {
            dto.setCycle(formation.getCycle().getName());
        }

        Filiere filiere = formation.getFiliere();
        if (filiere != null) {
            dto.setFiliere(filiere.getCode());
        }
    }
}
