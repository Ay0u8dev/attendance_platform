package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AdminJustificationResponse;
import ma.eniad.attendanceservice.dto.AdminJustificationReviewRequest;
import ma.eniad.attendanceservice.entity.AttendanceJustification;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.entity.JustificationStatus;
import ma.eniad.attendanceservice.repository.AttendanceJustificationRepository;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AdminJustificationServiceTest {

    private AttendanceJustificationRepository justificationRepository;
    private AttendanceRecordRepository attendanceRecordRepository;
    private AttendanceSessionRepository attendanceSessionRepository;
    private AdminJustificationService service;

    @BeforeEach
    void setUp() {
        justificationRepository = mock(AttendanceJustificationRepository.class);
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        service = new AdminJustificationService(
                justificationRepository,
                attendanceRecordRepository,
                attendanceSessionRepository
        );
    }

    @Test
    void listMapsJustificationRows() {
        when(justificationRepository.findAllByOrderByCreatedAtDescIdDesc())
                .thenReturn(List.of(justification(1L, JustificationStatus.PENDING)));

        List<AdminJustificationResponse> response = service.getJustifications(null);

        assertThat(response).hasSize(1);
        assertThat(response.getFirst().studentFirstName()).isEqualTo("Aya");
        assertThat(response.getFirst().status()).isEqualTo(JustificationStatus.PENDING);
    }

    @Test
    void reviewRejectsPendingStatus() {
        AdminJustificationReviewRequest request = new AdminJustificationReviewRequest(
                JustificationStatus.PENDING,
                null
        );

        assertThatThrownBy(() -> service.reviewJustification(1L, 99L, request))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void reviewStoresReviewerStatusAndComment() {
        AttendanceJustification justification = justification(1L, JustificationStatus.PENDING);
        when(justificationRepository.findById(1L)).thenReturn(Optional.of(justification));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(10L, 12L)).thenReturn(Optional.empty());
        when(justificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AdminJustificationResponse response = service.reviewJustification(
                1L,
                99L,
                new AdminJustificationReviewRequest(JustificationStatus.REJECTED, "Document incomplete")
        );

        assertThat(response.status()).isEqualTo(JustificationStatus.REJECTED);
        assertThat(response.reviewedBy()).isEqualTo(99L);
        assertThat(response.adminComment()).isEqualTo("Document incomplete");
        assertThat(response.reviewedAt()).isNotNull();
        verify(justificationRepository).save(justification);
    }

    @Test
    void approvingJustificationMarksLinkedAbsenceAsJustified() {
        AttendanceJustification justification = justification(1L, JustificationStatus.PENDING);
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(10L)
                .studentId(12L)
                .status(AttendanceStudentStatus.ABSENT)
                .build();
        AttendanceSession session = AttendanceSession.builder()
                .id(10L)
                .absentCount(2)
                .build();

        when(justificationRepository.findById(1L)).thenReturn(Optional.of(justification));
        when(attendanceRecordRepository.findBySessionIdAndStudentId(10L, 12L)).thenReturn(Optional.of(record));
        when(attendanceSessionRepository.findById(10L)).thenReturn(Optional.of(session));
        when(justificationRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        AdminJustificationResponse response = service.reviewJustification(
                1L,
                99L,
                new AdminJustificationReviewRequest(JustificationStatus.APPROVED, "Valid certificate")
        );

        assertThat(response.status()).isEqualTo(JustificationStatus.APPROVED);
        assertThat(record.getStatus()).isEqualTo(AttendanceStudentStatus.JUSTIFIED);
        assertThat(session.getAbsentCount()).isEqualTo(1);
        verify(attendanceRecordRepository).save(record);
        verify(attendanceSessionRepository).save(session);
    }

    private AttendanceJustification justification(Long id, JustificationStatus status) {
        return AttendanceJustification.builder()
                .id(id)
                .sessionId(10L)
                .studentId(12L)
                .groupId(1L)
                .studentFirstName("Aya")
                .studentLastName("Bennani")
                .studentEmail("aya@ump.ac.ma")
                .numApogee("240001")
                .courseLabel("Distributed Systems")
                .roomLabel("Room B12")
                .teacherFullName("Ayoub Elebbar")
                .absenceStartedAt(LocalDateTime.of(2026, 4, 28, 12, 0))
                .absenceEndedAt(LocalDateTime.of(2026, 4, 28, 12, 30))
                .motive("Certificat medical depose.")
                .attachmentLabel("certificat.pdf")
                .status(status)
                .createdAt(LocalDateTime.of(2026, 4, 29, 10, 0))
                .updatedAt(LocalDateTime.of(2026, 4, 29, 10, 0))
                .build();
    }
}
