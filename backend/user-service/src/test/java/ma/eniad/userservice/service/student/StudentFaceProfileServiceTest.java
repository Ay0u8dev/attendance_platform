package ma.eniad.userservice.service.student;

import com.fasterxml.jackson.databind.ObjectMapper;
import ma.eniad.userservice.dto.student.InternalFaceProfileRequest;
import ma.eniad.userservice.dto.student.InternalFaceProfileResponse;
import ma.eniad.userservice.dto.student.InternalStoredFaceProfileResponse;
import ma.eniad.userservice.entity.Student;
import ma.eniad.userservice.exception.InvalidInputException;
import ma.eniad.userservice.exception.ResourceNotFoundException;
import ma.eniad.userservice.repository.student.StudentRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataAccessResourceFailureException;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Base64;
import java.util.Optional;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class StudentFaceProfileServiceTest {
    private StudentRepository studentRepository;
    private StudentFaceProfileService service;

    @BeforeEach
    void setUp() {
        studentRepository = mock(StudentRepository.class);
        service = new StudentFaceProfileService(studentRepository);
    }

    @Test
    void validEmbeddingIsStoredAndCompletesFirstLogin() {
        Student student = student(true, null);
        when(studentRepository.findById(12L)).thenReturn(Optional.of(student));
        when(studentRepository.saveAndFlush(student)).thenReturn(student);

        InternalFaceProfileResponse response = service.enroll(12L, validRequest((byte) 7));

        assertThat(student.getEmbeddings()).hasSize(FaceEmbeddingMetadata.BYTE_LENGTH)
                .containsOnly((byte) 7);
        assertThat(student.isFirstLogin()).isFalse();
        assertThat(response.isAuthenticationRefreshRequired()).isTrue();
        assertThat(student.getFaceEmbeddingDimension()).isEqualTo(FaceEmbeddingMetadata.DIMENSION);
        assertThat(student.getFaceEmbeddingModel()).isEqualTo(FaceEmbeddingMetadata.MODEL);
        assertThat(student.getFaceEmbeddingFormat()).isEqualTo(FaceEmbeddingMetadata.FORMAT);
        assertThat(student.getFaceEnrolledAt()).isNotNull();
        assertThat(response.getStudentId()).isEqualTo(12L);
        assertThat(response.isEnrolled()).isTrue();
        assertThat(response.isFirstLogin()).isFalse();
        verify(studentRepository).saveAndFlush(student);
    }

    @Test
    void enrollmentUpdateIsTransactional() throws Exception {
        assertThat(StudentFaceProfileService.class
                .getMethod("enroll", Long.class, InternalFaceProfileRequest.class)
                .isAnnotationPresent(Transactional.class)).isTrue();
    }

    @Test
    void studentNotFoundUsesStandardException() {
        when(studentRepository.findById(12L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.enroll(12L, validRequest((byte) 1)))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Student not found");
    }

    @Test
    void invalidBase64IsRejected() {
        assertInvalid(request("not base64!", 128, FaceEmbeddingMetadata.MODEL, FaceEmbeddingMetadata.FORMAT));
    }

    @Test
    void emptyEmbeddingIsRejected() {
        assertInvalid(request(" ", 128, FaceEmbeddingMetadata.MODEL, FaceEmbeddingMetadata.FORMAT));
    }

    @Test
    void oversizedEmbeddingIsRejected() {
        assertInvalid(request("A".repeat(1025), 128, FaceEmbeddingMetadata.MODEL, FaceEmbeddingMetadata.FORMAT));
    }

    @Test
    void incorrectByteLengthIsRejected() {
        String shortEmbedding = Base64.getEncoder().encodeToString(new byte[511]);
        assertInvalid(request(shortEmbedding, 128, FaceEmbeddingMetadata.MODEL, FaceEmbeddingMetadata.FORMAT));
    }

    @Test
    void incorrectDimensionIsRejected() {
        InternalFaceProfileRequest valid = validRequest((byte) 1);
        assertInvalid(request(valid.getEmbedding(), 127, valid.getModel(), valid.getFormat()));
    }

    @Test
    void unsupportedModelIsRejected() {
        InternalFaceProfileRequest valid = validRequest((byte) 1);
        assertInvalid(request(valid.getEmbedding(), 128, "other", valid.getFormat()));
    }

    @Test
    void unsupportedFormatIsRejected() {
        InternalFaceProfileRequest valid = validRequest((byte) 1);
        assertInvalid(request(valid.getEmbedding(), 128, valid.getModel(), "other"));
    }

    @Test
    void saveFailureDoesNotProduceEnrollmentSuccess() {
        Student student = student(true, null);
        when(studentRepository.findById(12L)).thenReturn(Optional.of(student));
        when(studentRepository.saveAndFlush(student))
                .thenThrow(new DataAccessResourceFailureException("database unavailable"));

        assertThatThrownBy(() -> service.enroll(12L, validRequest((byte) 2)))
                .isInstanceOf(DataAccessResourceFailureException.class);
    }

    @Test
    void reenrollmentReplacesEmbeddingAndKeepsFirstLoginFalse() {
        byte[] oldEmbedding = new byte[FaceEmbeddingMetadata.BYTE_LENGTH];
        Arrays.fill(oldEmbedding, (byte) 3);
        Student student = student(false, oldEmbedding);
        when(studentRepository.findById(12L)).thenReturn(Optional.of(student));
        when(studentRepository.saveAndFlush(student)).thenReturn(student);

        InternalFaceProfileResponse response = service.enroll(12L, validRequest((byte) 9));

        assertThat(student.getEmbeddings()).containsOnly((byte) 9);
        assertThat(student.isFirstLogin()).isFalse();
        assertThat(response.isFirstLogin()).isFalse();
        assertThat(response.isAuthenticationRefreshRequired()).isFalse();
    }

    @Test
    void responseContractNeverContainsEmbedding() throws Exception {
        InternalFaceProfileResponse response = InternalFaceProfileResponse.builder()
                .studentId(12L)
                .enrolled(true)
                .firstLogin(false)
                .build();

        assertThat(new ObjectMapper().writeValueAsString(response))
                .contains("studentId", "enrolled", "firstLogin")
                .doesNotContain("embedding");
    }

    @Test
    void storedProfileIsReturnedWithEmbeddingAndMetadataForInternalVerification() {
        byte[] embedding = new byte[FaceEmbeddingMetadata.BYTE_LENGTH];
        Arrays.fill(embedding, (byte) 4);
        Student student = student(false, embedding);
        LocalDateTime enrolledAt = LocalDateTime.of(2026, 6, 22, 12, 0);
        student.setFaceEmbeddingDimension(FaceEmbeddingMetadata.DIMENSION);
        student.setFaceEmbeddingModel(FaceEmbeddingMetadata.MODEL);
        student.setFaceEmbeddingFormat(FaceEmbeddingMetadata.FORMAT);
        student.setFaceEnrolledAt(enrolledAt);
        when(studentRepository.findById(12L)).thenReturn(Optional.of(student));

        InternalStoredFaceProfileResponse response = service.getStoredProfile(12L);

        assertThat(Base64.getDecoder().decode(response.getEmbedding())).isEqualTo(embedding);
        assertThat(response.getStudentId()).isEqualTo(12L);
        assertThat(response.getDimension()).isEqualTo(FaceEmbeddingMetadata.DIMENSION);
        assertThat(response.getModel()).isEqualTo(FaceEmbeddingMetadata.MODEL);
        assertThat(response.getFormat()).isEqualTo(FaceEmbeddingMetadata.FORMAT);
        assertThat(response.getFaceEnrolledAt()).isEqualTo(enrolledAt);
    }

    @Test
    void missingStoredProfileReturnsNotFound() {
        Student student = student(false, null);
        when(studentRepository.findById(12L)).thenReturn(Optional.of(student));

        assertThatThrownBy(() -> service.getStoredProfile(12L))
                .isInstanceOf(ResourceNotFoundException.class)
                .hasMessage("Face profile not enrolled");
    }

    private void assertInvalid(InternalFaceProfileRequest request) {
        assertThatThrownBy(() -> service.enroll(12L, request))
                .isInstanceOf(InvalidInputException.class);
    }

    private InternalFaceProfileRequest validRequest(byte value) {
        byte[] bytes = new byte[FaceEmbeddingMetadata.BYTE_LENGTH];
        Arrays.fill(bytes, value);
        return request(
                Base64.getEncoder().encodeToString(bytes),
                FaceEmbeddingMetadata.DIMENSION,
                FaceEmbeddingMetadata.MODEL,
                FaceEmbeddingMetadata.FORMAT
        );
    }

    private InternalFaceProfileRequest request(String embedding, Integer dimension, String model, String format) {
        return InternalFaceProfileRequest.builder()
                .embedding(embedding)
                .dimension(dimension)
                .model(model)
                .format(format)
                .build();
    }

    private Student student(boolean firstLogin, byte[] embedding) {
        Student student = new Student();
        student.setId(12L);
        student.setFirstLogin(firstLogin);
        student.setEmbeddings(embedding);
        return student;
    }
}
