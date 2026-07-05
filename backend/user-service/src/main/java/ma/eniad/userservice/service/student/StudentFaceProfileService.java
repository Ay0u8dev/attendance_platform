package ma.eniad.userservice.service.student;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.student.InternalFaceProfileRequest;
import ma.eniad.userservice.dto.student.InternalFaceProfileResponse;
import ma.eniad.userservice.dto.student.InternalStoredFaceProfileResponse;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.exception.InvalidInputException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.repository.student.StudentRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Base64;

@Service
@RequiredArgsConstructor
public class StudentFaceProfileService {

    private final StudentRepository studentRepository;

    @Transactional
    public InternalFaceProfileResponse enroll(
            Long studentId,
            InternalFaceProfileRequest request
    ) {
        byte[] embedding = decodeAndValidate(request);

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() ->
                        new ResourceNotFoundException("Student not found")
                );

        boolean authenticationRefreshRequired = student.isFirstLogin();
        LocalDateTime enrolledAt = LocalDateTime.now();

        student.setEmbeddings(embedding);
        student.setFaceEmbeddingDimension(FaceEmbeddingMetadata.DIMENSION);
        student.setFaceEmbeddingModel(FaceEmbeddingMetadata.MODEL);
        student.setFaceEmbeddingFormat(FaceEmbeddingMetadata.FORMAT);
        student.setFaceEnrolledAt(enrolledAt);
        student.setFirstLogin(false);

        Student savedStudent = studentRepository.saveAndFlush(student);

        return InternalFaceProfileResponse.builder()
                .studentId(savedStudent.getId())
                .enrolled(true)
                .firstLogin(savedStudent.isFirstLogin())
                .faceEnrolledAt(savedStudent.getFaceEnrolledAt())
                .authenticationRefreshRequired(authenticationRefreshRequired)
                .build();
    }

    @Transactional(readOnly = true)
    public InternalStoredFaceProfileResponse getStoredProfile(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new ResourceNotFoundException("Student not found"));

        if (student.getEmbeddings() == null
                || student.getEmbeddings().length == 0
                || student.getFaceEmbeddingDimension() == null
                || student.getFaceEmbeddingModel() == null
                || student.getFaceEmbeddingFormat() == null
                || student.getFaceEnrolledAt() == null) {
            throw new ResourceNotFoundException("Face profile not enrolled");
        }

        return InternalStoredFaceProfileResponse.builder()
                .studentId(student.getId())
                .embedding(Base64.getEncoder().encodeToString(student.getEmbeddings()))
                .dimension(student.getFaceEmbeddingDimension())
                .model(student.getFaceEmbeddingModel())
                .format(student.getFaceEmbeddingFormat())
                .faceEnrolledAt(student.getFaceEnrolledAt())
                .build();
    }

    private byte[] decodeAndValidate(InternalFaceProfileRequest request) {
        validateRequest(request);

        byte[] decodedEmbedding = decodeBase64(request.getEmbedding());

        if (decodedEmbedding.length != FaceEmbeddingMetadata.BYTE_LENGTH) {
            throw new InvalidInputException(
                    "Embedding must contain exactly "
                            + FaceEmbeddingMetadata.BYTE_LENGTH
                            + " bytes"
            );
        }

        return decodedEmbedding;
    }

    private void validateRequest(InternalFaceProfileRequest request) {
        if (request == null) {
            throw new InvalidInputException("Face profile request is required");
        }

        String embedding = request.getEmbedding();

        if (embedding == null || embedding.isBlank()) {
            throw new InvalidInputException("Embedding is required");
        }

        if (embedding.length() > FaceEmbeddingMetadata.MAX_BASE64_LENGTH) {
            throw new InvalidInputException("Embedding is too large");
        }

        if (request.getDimension() == null
                || request.getDimension() != FaceEmbeddingMetadata.DIMENSION) {
            throw new InvalidInputException("Unsupported embedding dimension");
        }

        if (!FaceEmbeddingMetadata.MODEL.equals(request.getModel())) {
            throw new InvalidInputException("Unsupported embedding model");
        }

        if (!FaceEmbeddingMetadata.FORMAT.equals(request.getFormat())) {
            throw new InvalidInputException("Unsupported embedding format");
        }
    }

    private byte[] decodeBase64(String embedding) {
        try {
            return Base64.getDecoder().decode(embedding);
        } catch (IllegalArgumentException exception) {
            throw new InvalidInputException("Embedding is not valid Base64");
        }
    }
}
