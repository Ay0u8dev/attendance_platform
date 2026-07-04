package ma.eniad.userservice.service.teacher;

import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.teacher.TeacherProfileDto;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.entity.structure.Filiere;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.TeacherAssignmentRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.service.CloudflareR2Service;
import ma.eniad.userservice.service.UserContext;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final TeacherAssignmentRepository assignmentRepository;
    private final TeacherMapper      teacherMapper;
    private final CloudflareR2Service r2Service;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------
    @Transactional
    public TeacherResponseDTO create(TeacherRequestDTO request) {
        String normalizedEmail = normalizeEmail(request.getEmail());
        request.setEmail(normalizedEmail);
        validateEmailDomain(normalizedEmail);

        Teacher teacher = teacherMapper.toEntity(request);
        if (teacher.getRoles() == null) {
            teacher.setRoles(new HashSet<>());
        }
        teacher.getRoles().add(Role.TEACHER);
        applyAccountState(request, teacher, true, true);

        try {
            return teacherMapper.toResponse(teacherRepository.save(teacher));
        } catch (DataIntegrityViolationException ex) {
            if (normalizedEmail != null && userRepository.existsByEmail(normalizedEmail)) {
                throw new DuplicateResourceException("Email already exists");
            }
            throw ex;
        }    
    }

    // -------------------------------------------------------------------------
    // Read
    // -------------------------------------------------------------------------
    public TeacherResponseDTO getById(Long id) {
        Teacher teacher = findTeacherById(id);
        return teacherMapper.toResponse(teacher);
    }

    public List<TeacherResponseDTO> getAll() {
        List<Teacher> teachers = teacherRepository.findAll();
        return teachers.stream()
                .map(teacherMapper::toResponse)
                .toList();
    }

    public TeacherProfileDto getCurrentProfile() {
        Teacher teacher = findCurrentTeacher();
        return buildCurrentProfile(teacher);
    }

    @Transactional
    public TeacherProfileDto updateCurrentProfilePhoto(String pfpUrl) {
        Teacher teacher = findCurrentTeacher();
        teacher.setPfpUrl(pfpUrl);
        teacherRepository.save(teacher);
        return buildCurrentProfile(teacher);
    }

    @Transactional
    public TeacherProfileDto removeCurrentProfilePhoto() {
        Teacher teacher = findCurrentTeacher();
        r2Service.deleteProfilePhotoIfOwned(teacher.getPfpUrl());
        teacher.setPfpUrl(null);
        teacherRepository.save(teacher);
        return buildCurrentProfile(teacher);
    }

    // -------------------------------------------------------------------------
    // Update
    // -------------------------------------------------------------------------
    @Transactional
    public TeacherResponseDTO update(Long id, TeacherRequestDTO request) {
        Teacher teacher = findTeacherById(id);
        if (request.getEmail() != null){
            String normalizedEmail = normalizeEmail(request.getEmail());
            request.setEmail(normalizedEmail);
            validateEmailDomain(normalizedEmail);
        }

        teacherMapper.updateEntity(request, teacher);
        applyAccountState(request, teacher, teacher.isEnabled(), teacher.isFirstLogin());
        try {
            return teacherMapper.toResponse(teacherRepository.save(teacher));
        } catch (DataIntegrityViolationException ex) {
             if (request.getEmail() != null) {
                userRepository.findByEmail(request.getEmail())
                    .filter(existing -> !existing.getId().equals(id))
                    .ifPresent(existing -> {
                        throw new DuplicateResourceException("Email already exists");
                    });
            }

            throw ex;
        }
    }

    // -------------------------------------------------------------------------
    // Delete
    // -------------------------------------------------------------------------
    @Transactional
    public void delete(Long id) {
        Teacher teacher = findTeacherById(id);
        teacherRepository.delete(teacher);
    }



    // -------------------------------------------------------------------------
    // Private helpers
    // -------------------------------------------------------------------------

    private Teacher findTeacherById(Long id) {
        return teacherRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
    }

    private Teacher findCurrentTeacher() {
        UserContext.UserInfo context = UserContext.getCurrentUser();
        if (context == null || context.getUserId() == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing user context");
        }

        Long teacherId;
        try {
            teacherId = Long.parseLong(context.getUserId());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid user id");
        }

        return teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResourceNotFoundException("Teacher not found"));
    }

    private TeacherProfileDto buildCurrentProfile(Teacher teacher) {
        List<TeacherAssignment> assignments = assignmentRepository.findByTeacherId(teacher.getId());
        List<String> modules = distinctLabels(assignments.stream()
                .map(TeacherAssignment::getModule)
                .filter(Objects::nonNull)
                .map(ma.eniad.userservice.entity.structure.Module::getName)
                .toList());
        List<String> groupes = distinctLabels(assignments.stream()
                .map(TeacherAssignment::getGroupe)
                .filter(Objects::nonNull)
                .map(ma.eniad.userservice.entity.structure.Groupe::getName)
                .toList());
        List<String> formations = distinctLabels(assignments.stream()
                .map(TeacherAssignment::getFormation)
                .filter(Objects::nonNull)
                .map(Formation::getName)
                .toList());
        List<String> filieres = distinctLabels(assignments.stream()
                .map(TeacherAssignment::getFormation)
                .filter(Objects::nonNull)
                .map(Formation::getFiliere)
                .filter(Objects::nonNull)
                .map(Filiere::getCode)
                .toList());

        return TeacherProfileDto.builder()
                .id(teacher.getId())
                .email(teacher.getEmail())
                .firstName(teacher.getFirstName())
                .lastName(teacher.getLastName())
                .pfpUrl(teacher.getPfpUrl())
                .enabled(teacher.isEnabled())
                .firstLogin(teacher.isFirstLogin())
                .createdAt(teacher.getCreatedAt())
                .updatedAt(teacher.getUpdatedAt())
                .moduleCount(modules.size())
                .groupCount(groupes.size())
                .formationCount(formations.size())
                .modules(modules)
                .groupes(groupes)
                .formations(formations)
                .filieres(filieres)
                .build();
    }

    private List<String> distinctLabels(List<String> values) {
        return values.stream()
                .map(this::normalizeLabel)
                .filter(Objects::nonNull)
                .distinct()
                .sorted()
                .toList();
    }

    private String normalizeLabel(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
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

    private String normalizeEmail(String email) {
        if (email == null) {
            return null;
        }

        return email.trim().toLowerCase();
    }

    private void applyAccountState(TeacherRequestDTO request,
                                   Teacher teacher,
                                   boolean defaultEnabled,
                                   boolean defaultFirstLogin) {
        boolean enabled = request.getEnabled() == null ? defaultEnabled : request.getEnabled();
        boolean firstLogin = request.getFirstLogin() == null ? defaultFirstLogin : request.getFirstLogin();

        teacher.setEnabled(enabled);
        teacher.setFirstLogin(enabled && firstLogin);
    }
}
