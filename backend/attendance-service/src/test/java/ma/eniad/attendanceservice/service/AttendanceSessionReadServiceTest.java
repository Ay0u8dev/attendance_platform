package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AttendanceSessionReadServiceTest {

    private final AttendanceSessionRepository attendanceSessionRepository = mock(AttendanceSessionRepository.class);
    private final AttendanceRecordRepository attendanceRecordRepository = mock(AttendanceRecordRepository.class);
    private final LiveAttendanceSessionStore liveAttendanceSessionStore = mock(LiveAttendanceSessionStore.class);
    private final AttendanceSessionReadService attendanceSessionReadService =
            new AttendanceSessionReadService(attendanceSessionRepository, attendanceRecordRepository, liveAttendanceSessionStore);

    @Test
    void getSessionReturnsActiveStateFromRedis() {
        AttendanceSession session = baseSession(AttendanceSessionStatus.ACTIVE);
        when(attendanceSessionRepository.findByIdAndTeacherId(100L, 77L)).thenReturn(Optional.of(session));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(new LiveAttendanceSessionMeta(
                100L, 77L, "Ayoub Elebbar", List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                session.getStartedAt(), session.getEndsAt(), AttendanceSessionStatus.ACTIVE
        )));
        when(liveAttendanceSessionStore.findAllStudentStates(100L)).thenReturn(List.of(
                new LiveAttendanceStudentState(10L, 1L, "Aya", "Bennani", "aya@ump.ac.ma", "https://cdn.example.com/aya.jpg", "A001",
                        "GI", "GI-1",
                        AttendanceStudentStatus.PRESENT, LocalDateTime.of(2026, 4, 28, 12, 5),
                        AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091"),
                new LiveAttendanceStudentState(11L, 1L, "Yassine", "Fassi", "yassine@ump.ac.ma", "https://cdn.example.com/yassine.jpg", "A002",
                        "GI", "GI-1",
                        AttendanceStudentStatus.UNKNOWN, null, null, null, null, null)
        ));
        when(liveAttendanceSessionStore.getAttendanceCounts(100L)).thenReturn(new AttendanceCounts(1, 0, 1));

        AttendanceSessionDetailsResponse response = attendanceSessionReadService.getSession(100L, 77L);

        assertThat(response.status()).isEqualTo(AttendanceSessionStatus.ACTIVE);
        assertThat(response.teacherFullName()).isEqualTo("Ayoub Elebbar");
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(response.students()).hasSize(2);
        assertThat(response.students().getFirst().markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
        assertThat(response.students().getLast().status()).isEqualTo(AttendanceStudentStatus.UNKNOWN);
    }

    @Test
    void getSessionReturnsFinalizedStateFromDatabase() {
        AttendanceSession session = baseSession(AttendanceSessionStatus.FINALIZED);
        when(attendanceSessionRepository.findByIdAndTeacherId(100L, 77L)).thenReturn(Optional.of(session));
        when(attendanceRecordRepository.findBySessionIdOrderByStudentIdAsc(100L)).thenReturn(List.of(
                AttendanceRecord.builder()
                        .sessionId(100L)
                        .studentId(10L)
                        .groupId(1L)
                        .firstName("Aya")
                        .lastName("Bennani")
                        .email("aya@ump.ac.ma")
                        .pfpUrl("https://cdn.example.com/aya.jpg")
                        .numApogee("A001")
                        .status(AttendanceStudentStatus.PRESENT)
                        .markMethod(AttendanceSessionMethod.QR_CODE)
                        .markedAt(LocalDateTime.of(2026, 4, 28, 12, 5))
                        .build(),
                AttendanceRecord.builder()
                        .sessionId(100L)
                        .studentId(11L)
                        .groupId(1L)
                        .firstName("Yassine")
                        .lastName("Fassi")
                        .email("yassine@ump.ac.ma")
                        .pfpUrl("https://cdn.example.com/yassine.jpg")
                        .numApogee("A002")
                        .status(AttendanceStudentStatus.ABSENT)
                        .build()
        ));

        AttendanceSessionDetailsResponse response = attendanceSessionReadService.getSession(100L, 77L);

        assertThat(response.status()).isEqualTo(AttendanceSessionStatus.FINALIZED);
        assertThat(response.teacherFullName()).isEqualTo("Ayoub Elebbar");
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(response.absentCount()).isEqualTo(1);
        assertThat(response.unknownCount()).isZero();
        assertThat(response.students().getFirst().firstName()).isEqualTo("Aya");
        assertThat(response.students().getFirst().markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
        assertThat(response.students().getLast().markMethod()).isNull();
    }

    @Test
    void getSessionRejectsWhenTeacherDoesNotOwnActiveSessionMeta() {
        AttendanceSession session = baseSession(AttendanceSessionStatus.ACTIVE);
        when(attendanceSessionRepository.findByIdAndTeacherId(100L, 77L)).thenReturn(Optional.of(session));
        when(liveAttendanceSessionStore.findSessionMeta(100L)).thenReturn(Optional.of(new LiveAttendanceSessionMeta(
                100L, 88L, "Wrong Teacher", List.of(1L), "Distributed Systems", "Room B12", "34.6814", "-1.9086",
                session.getStartedAt(), session.getEndsAt(), AttendanceSessionStatus.ACTIVE
        )));

        assertThatThrownBy(() -> attendanceSessionReadService.getSession(100L, 77L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    private AttendanceSession baseSession(AttendanceSessionStatus status) {
        return AttendanceSession.builder()
                .id(100L)
                .teacherId(77L)
                .teacherFullName("Ayoub Elebbar")
                .groupIds(List.of(1L))
                .courseLabel("Distributed Systems")
                .roomLabel("Room B12")
                .gpsLat("34.6814")
                .gpsLon("-1.9086")
                .startedAt(LocalDateTime.of(2026, 4, 28, 12, 0))
                .endsAt(LocalDateTime.of(2026, 4, 28, 12, 30))
                .endedAt(status == AttendanceSessionStatus.FINALIZED ? LocalDateTime.of(2026, 4, 28, 12, 30) : null)
                .method(AttendanceSessionMethod.QR_CODE)
                .status(status)
                .presentCount(status == AttendanceSessionStatus.FINALIZED ? 1 : 0)
                .absentCount(status == AttendanceSessionStatus.FINALIZED ? 1 : 0)
                .unknownCount(status == AttendanceSessionStatus.FINALIZED ? 0 : 0)
                .build();
    }
}
