package ma.eniad.userservice.service.student;

import java.util.List;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.exception.DuplicateResourceException;
import ma.eniad.userservice.exception.InvalidDomainException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.mapper.student.StudentMapper;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.student.StudentRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class StudentService {
    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
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
        student.getRoles().add(Role.STUDENT);
        student.setEnabled(true);
        student.setFirstLogin(true);

        try {
            return studentMapper.toResponse(studentRepository.save(student));
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
        return studentMapper.toResponse(findStudentById(id));
    }

    public List<StudentResponseDTO> getAll() {
        return studentRepository.findAll().stream()
                .map(studentMapper::toResponse)
                .toList();
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
        try {
            return studentMapper.toResponse(studentRepository.save(student));
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
}
