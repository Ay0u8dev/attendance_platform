package ma.eniad.userservice.service.teacher;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.mapper.teacher.TeacherMapper;


@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class TeacherService {

    private final TeacherRepository teacherRepository;
    private final UserRepository userRepository;
    private final TeacherMapper      teacherMapper;

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
        teacher.getRoles().add(Role.TEACHER);
        teacher.setEnabled(true);
        teacher.setFirstLogin(true);

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
        try {
            return teacherMapper.toResponse(teacherRepository.save(teacher));
        } catch (DataIntegrityViolationException ex) {
            if (request.getEmail() != null && userRepository.existsByEmail(request.getEmail())) {
                if(request.getEmail() != null) {
                    userRepository.findByEmail(request.getEmail()).ifPresent(user -> {
                        if (!user.getId().equals(id)) {
                            throw new InvalidDomainException("Email already exists");
                        }
                    });
                }
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
}
