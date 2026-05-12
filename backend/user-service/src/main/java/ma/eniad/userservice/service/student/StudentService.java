package ma.eniad.userservice.service.student;

import java.util.List;

import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.exception.DuplicateResourceException;
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
    private final UserRepository     userRepository;
    private final StudentMapper      studentMapper;

    // -------------------------------------------------------------------------
    // Create
    // -------------------------------------------------------------------------
    
    @Transactional
    public StudentResponseDTO create(StudentRequestDTO request) {
        // Email must be unique across all User sub-types
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        // numApogee must be unique among students
        if (studentRepository.existsByNumApogee(request.getNumApogee())) {
            throw new DuplicateResourceException("NumApogee already exists");
        }

        Student student = studentMapper.toEntity(request);
        student.getRoles().add(Role.STUDENT);
        student.setEnabled(true);
        student.setFirstLogin(true);

        try {
            return studentMapper.toResponse(studentRepository.save(student));
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("Email or numApogee already exists");
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

        // Check email uniqueness if it's being updated
        if (request.getEmail() != null && !request.getEmail().equals(student.getEmail()) &&
            userRepository.existsByEmail(request.getEmail())) {
            throw new DuplicateResourceException("Email already exists");
        }

        // Check numApogee uniqueness if it's being updated
        if (request.getNumApogee() != null && !request.getNumApogee().equals(student.getNumApogee()) &&
            studentRepository.existsByNumApogeeAndIdNot(request.getNumApogee(), id)) {
            throw new DuplicateResourceException("NumApogee already exists");
        }   

        studentMapper.updateEntity(request, student);
        try {
            return studentMapper.toResponse(studentRepository.save(student));
        } catch (DataIntegrityViolationException ex) {
            throw new DuplicateResourceException("Email or numApogee already exists");
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
}
