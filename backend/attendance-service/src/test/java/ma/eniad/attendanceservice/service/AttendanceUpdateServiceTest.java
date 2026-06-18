package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceUpdateEvent;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.InternalAttendanceUpdateRequest;
import ma.eniad.attendanceservice.dto.JustifyAbsenceRequest;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.ManualAttendanceUpdateRequest;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AttendanceUpdateServiceTest {

    private SimpMessagingTemplate messagingTemplate;
    private InMemoryLiveAttendanceSessionStore liveAttendanceSessionStore;
    private AttendanceUpdateService attendanceUpdateService;
    private AttendanceRecordRepository attendanceRecordRepository;
    private AttendanceSessionRepository attendanceSessionRepository;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        liveAttendanceSessionStore = new InMemoryLiveAttendanceSessionStore();
        attendanceRecordRepository = mock(AttendanceRecordRepository.class);
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        attendanceUpdateService = new AttendanceUpdateService(
                liveAttendanceSessionStore,
                messagingTemplate,
                attendanceRecordRepository,
                attendanceSessionRepository
        );
    }

    @Test
    void manualUpdateSucceedsForSessionOwner() {
        seedSession();

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.PRESENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.PRESENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.MANUAL);
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(liveAttendanceSessionStore.findStudentState(100L, 10L).orElseThrow().status())
                .isEqualTo(AttendanceStudentStatus.PRESENT);

        verify(messagingTemplate).convertAndSend(eq("/topic/attendance.sessions.100"), eq(new AttendanceUpdateEvent(
                "ATTENDANCE_UPDATED",
                100L,
                10L,
                AttendanceStudentStatus.PRESENT,
                AttendanceSessionMethod.MANUAL,
                response.markedAt(),
                1,
                0,
                1
        )));
    }

    @Test
    void manualUpdateRejectsNonOwnerTeacher() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateManualAttendance(
                88L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.PRESENT)
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void manualUpdateAcceptsAbsentStatus() {
        seedSession();

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.ABSENT);
        assertThat(response.absentCount()).isEqualTo(1);
    }

    @Test
    void justifyFinalizedAbsenceChangesAbsentRecordToJustified() {
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(10L)
                .status(AttendanceStudentStatus.ABSENT)
                .build();
        AttendanceSession session = AttendanceSession.builder()
                .id(100L)
                .absentCount(2)
                .build();

        when(attendanceRecordRepository.findBySessionIdAndStudentId(100L, 10L)).thenReturn(Optional.of(record));
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(session));

        attendanceUpdateService.justifyFinalizedAbsence(
                "justification-service",
                100L,
                10L,
                new JustifyAbsenceRequest(50L, "Admin")
        );

        assertThat(record.getStatus()).isEqualTo(AttendanceStudentStatus.JUSTIFIED);
        assertThat(session.getAbsentCount()).isEqualTo(1);
        verify(attendanceRecordRepository).save(record);
        verify(attendanceSessionRepository).save(session);
    }

    @Test
    void justifyFinalizedAbsenceRejectsNonAbsentRecord() {
        AttendanceRecord record = AttendanceRecord.builder()
                .sessionId(100L)
                .studentId(10L)
                .status(AttendanceStudentStatus.PRESENT)
                .build();

        when(attendanceRecordRepository.findBySessionIdAndStudentId(100L, 10L)).thenReturn(Optional.of(record));

        assertThatThrownBy(() -> attendanceUpdateService.justifyFinalizedAbsence(
                "justification-service",
                100L,
                10L,
                new JustifyAbsenceRequest(50L, "Admin")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting("statusCode")
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalQrUpdateSucceedsForMethodNeutralSession() {
        seedSession();

        AttendanceUpdateResponse response = attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091")
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.PRESENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(liveAttendanceSessionStore.findStudentIdByDevice(100L, "phone-10")).contains(10L);
    }

    @Test
    void internalFaceUpdateSucceedsForMethodNeutralSession() {
        seedSession();

        AttendanceUpdateResponse response = attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "phone-10", "34.6820", "-1.9091")
        );

        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.FACE_ID);
        assertThat(liveAttendanceSessionStore.findStudentIdByDevice(100L, "phone-10")).contains(10L);
    }

    @Test
    void internalUpdateRejectsMethodMismatch() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "device-face", "34.6800", "-1.9000")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalUpdateRejectsUnknownSession() {
        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                999L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void internalUpdateRejectsUnknownStudent() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(99L, AttendanceSessionMethod.QR_CODE, "phone-99", "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void internalFaceUpdateRejectsMissingDeviceId() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, null, "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void internalUpdateRejectsDeviceAlreadyUsedByAnotherStudent() {
        seedSession();
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "shared-device", "34.6820", "-1.9091")
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(11L, AttendanceSessionMethod.QR_CODE, "shared-device", "34.6821", "-1.9092")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalUpdateRejectsDifferentDeviceForSameStudent() {
        seedSession();
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "device-1", "34.6820", "-1.9091")
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "device-2", "34.6821", "-1.9092")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalQrUpdateRejectsMissingDeviceId() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, null, "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void internalQrUpdateRejectsMissingGps() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                        "qr-service",
                        100L,
                        new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", null, null)
                ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void internalFaceUpdateRejectsMissingGps() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                        "face-service",
                        100L,
                        new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "phone-10", null, null)
                ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.BAD_REQUEST);
    }

    @Test
    void internalQrUpdateRejectsStudentTooFarFromSessionLocation() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                        "qr-service",
                        100L,
                        new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "35.6820", "-1.9091")
                ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void internalFaceUpdateRejectsStudentTooFarFromSessionLocation() {
        seedSession();

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                        "face-service",
                        100L,
                        new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "phone-10", "35.6820", "-1.9091")
                ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.FORBIDDEN);
    }

    @Test
    void internalUpdateRejectsAlreadyResolvedStudent() {
        seedSession();
        attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "phone-10", "34.6820", "-1.9091")
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void selfMarkRejectsAfterManualResolution() {
        seedSession();
        attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void latestUpdateWinsFromQrPresentToManualAbsent() {
        seedSession();
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10", "34.6820", "-1.9091")
        );

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.ABSENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.MANUAL);
        assertThat(liveAttendanceSessionStore.findStudentIdByDevice(100L, "phone-10")).contains(10L);
    }

    @Test
    void latestUpdateWinsFromFacePresentToManualAbsent() {
        seedSession();
        attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "phone-10", "34.6820", "-1.9091")
        );

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.ABSENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.MANUAL);
    }

    private void seedSession() {
        liveAttendanceSessionStore.initializeSession(
                new LiveAttendanceSessionMeta(
                        100L,
                        77L,
                        "Ayoub Elebbar",
                        List.of(1L),
                        "Distributed Systems",
                        "Room B12",
                        "34.6814",
                        "-1.9086",
                        LocalDateTime.now(),
                        LocalDateTime.now().plusMinutes(30),
                        AttendanceSessionStatus.ACTIVE
                ),
                List.of(
                        new LiveAttendanceStudentState(
                                10L,
                                1L,
                                "Aya",
                                "Bennani",
                                "aya@ump.ac.ma",
                                "https://cdn.example.com/aya.jpg",
                                "A001",
                                AttendanceStudentStatus.UNKNOWN,
                                null,
                                null,
                                null,
                                null,
                                null
                        ),
                        new LiveAttendanceStudentState(
                                11L,
                                1L,
                                "Yassine",
                                "Fassi",
                                "yassine@ump.ac.ma",
                                "https://cdn.example.com/yassine.jpg",
                                "A002",
                                AttendanceStudentStatus.UNKNOWN,
                                null,
                                null,
                                null,
                                null,
                                null
                        )
                )
        );
    }

    private static final class InMemoryLiveAttendanceSessionStore implements LiveAttendanceSessionStore {
        private final Map<Long, LiveAttendanceSessionMeta> sessionMeta = new HashMap<>();
        private final Map<Long, Map<Long, LiveAttendanceStudentState>> studentsBySession = new HashMap<>();
        private final Map<Long, Map<String, Long>> devicesBySession = new HashMap<>();

        @Override
        public void initializeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students) {
            sessionMeta.put(meta.sessionId(), meta);
            Map<Long, LiveAttendanceStudentState> sessionStudents = new HashMap<>();
            for (LiveAttendanceStudentState student : students) {
                sessionStudents.put(student.studentId(), student);
            }
            studentsBySession.put(meta.sessionId(), sessionStudents);
            devicesBySession.put(meta.sessionId(), new HashMap<>());
        }

        @Override
        public Optional<LiveAttendanceSessionMeta> findSessionMeta(Long sessionId) {
            return Optional.ofNullable(sessionMeta.get(sessionId));
        }

        @Override
        public Optional<LiveAttendanceStudentState> findStudentState(Long sessionId, Long studentId) {
            return Optional.ofNullable(studentsBySession.getOrDefault(sessionId, Map.of()).get(studentId));
        }

        @Override
        public List<LiveAttendanceStudentState> findAllStudentStates(Long sessionId) {
            return new ArrayList<>(studentsBySession.getOrDefault(sessionId, Map.of()).values());
        }

        @Override
        public Optional<Long> findStudentIdByDevice(Long sessionId, String deviceId) {
            return Optional.ofNullable(devicesBySession.getOrDefault(sessionId, Map.of()).get(deviceId));
        }

        @Override
        public Optional<String> findDeviceIdByStudent(Long sessionId, Long studentId) {
            return devicesBySession.getOrDefault(sessionId, Map.of())
                    .entrySet()
                    .stream()
                    .filter(entry -> entry.getValue().equals(studentId))
                    .map(Map.Entry::getKey)
                    .findFirst();
        }

        @Override
        public void saveStudentState(Long sessionId, LiveAttendanceStudentState studentState) {
            studentsBySession.get(sessionId).put(studentState.studentId(), studentState);
        }

        @Override
        public void bindDeviceToStudent(Long sessionId, String deviceId, Long studentId) {
            devicesBySession.get(sessionId).put(deviceId, studentId);
        }

        @Override
        public AttendanceCounts getAttendanceCounts(Long sessionId) {
            int present = 0;
            int absent = 0;
            int unknown = 0;
            for (LiveAttendanceStudentState state : studentsBySession.getOrDefault(sessionId, Map.of()).values()) {
                if (state.status() == AttendanceStudentStatus.PRESENT) {
                    present++;
                } else if (state.status() == AttendanceStudentStatus.ABSENT) {
                    absent++;
                } else {
                    unknown++;
                }
            }
            return new AttendanceCounts(present, absent, unknown);
        }

        @Override
        public void finalizeSession(LiveAttendanceSessionMeta meta, List<LiveAttendanceStudentState> students, Duration retention) {
            sessionMeta.put(meta.sessionId(), meta);
            Map<Long, LiveAttendanceStudentState> sessionStudents = new HashMap<>();
            for (LiveAttendanceStudentState student : students) {
                sessionStudents.put(student.studentId(), student);
            }
            studentsBySession.put(meta.sessionId(), sessionStudents);
            devicesBySession.computeIfAbsent(meta.sessionId(), ignored -> new HashMap<>());
        }
    }
}
