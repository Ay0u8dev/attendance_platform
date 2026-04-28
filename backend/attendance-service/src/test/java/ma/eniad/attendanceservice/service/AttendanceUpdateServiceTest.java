package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceUpdateEvent;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.InternalAttendanceUpdateRequest;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.ManualAttendanceUpdateRequest;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class AttendanceUpdateServiceTest {

    private SimpMessagingTemplate messagingTemplate;
    private InMemoryLiveAttendanceSessionStore liveAttendanceSessionStore;
    private AttendanceUpdateService attendanceUpdateService;

    @BeforeEach
    void setUp() {
        messagingTemplate = mock(SimpMessagingTemplate.class);
        liveAttendanceSessionStore = new InMemoryLiveAttendanceSessionStore();
        attendanceUpdateService = new AttendanceUpdateService(liveAttendanceSessionStore, messagingTemplate);
    }

    @Test
    void manualUpdateSucceedsForSessionOwner() {
        seedSession(AttendanceSessionMethod.QR_CODE);

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.PRESENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.PRESENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.MANUAL);
        assertThat(response.deviceId()).isNull();
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(liveAttendanceSessionStore.findStudentState(100L, 10L).orElseThrow().status())
                .isEqualTo(AttendanceStudentStatus.PRESENT);

        verify(messagingTemplate).convertAndSend(eq("/topic/attendance.sessions.100"), eq(new AttendanceUpdateEvent(
                "ATTENDANCE_UPDATED",
                100L,
                10L,
                AttendanceStudentStatus.PRESENT,
                AttendanceSessionMethod.MANUAL,
                null,
                response.markedAt(),
                1,
                0,
                1
        )));
    }

    @Test
    void manualUpdateRejectsNonOwnerTeacher() {
        seedSession(AttendanceSessionMethod.QR_CODE);

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
        seedSession(AttendanceSessionMethod.QR_CODE);

        AttendanceUpdateResponse response = attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.ABSENT);
        assertThat(response.absentCount()).isEqualTo(1);
    }

    @Test
    void internalQrUpdateSucceedsForQrSession() {
        seedSession(AttendanceSessionMethod.QR_CODE);

        AttendanceUpdateResponse response = attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10")
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.PRESENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
        assertThat(response.deviceId()).isEqualTo("phone-10");
        assertThat(response.presentCount()).isEqualTo(1);
        assertThat(liveAttendanceSessionStore.findStudentIdByDevice(100L, "phone-10")).contains(10L);
    }

    @Test
    void internalFaceUpdateSucceedsForFaceSession() {
        seedSession(AttendanceSessionMethod.FACE_ID);

        AttendanceUpdateResponse response = attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "device-face")
        );

        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.FACE_ID);
        assertThat(response.deviceId()).isEqualTo("device-face");
    }

    @Test
    void internalUpdateRejectsMethodMismatch() {
        seedSession(AttendanceSessionMethod.QR_CODE);

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "face-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.FACE_ID, "device-face")
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
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void internalUpdateRejectsUnknownStudent() {
        seedSession(AttendanceSessionMethod.QR_CODE);

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(99L, AttendanceSessionMethod.QR_CODE, "phone-99")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    void internalUpdateRejectsDeviceAlreadyUsedByAnotherStudent() {
        seedSession(AttendanceSessionMethod.QR_CODE);
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "shared-device")
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(11L, AttendanceSessionMethod.QR_CODE, "shared-device")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalUpdateRejectsDifferentDeviceForSameStudent() {
        seedSession(AttendanceSessionMethod.QR_CODE);
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "device-1")
        );

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "device-2")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void internalUpdateRejectsManualSession() {
        seedSession(AttendanceSessionMethod.MANUAL);

        assertThatThrownBy(() -> attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10")
        ))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.CONFLICT);
    }

    @Test
    void latestUpdateWinsFromManualAbsentToQrPresent() {
        seedSession(AttendanceSessionMethod.QR_CODE);
        attendanceUpdateService.updateManualAttendance(
                77L,
                100L,
                new ManualAttendanceUpdateRequest(10L, AttendanceStudentStatus.ABSENT)
        );

        AttendanceUpdateResponse response = attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10")
        );

        assertThat(response.status()).isEqualTo(AttendanceStudentStatus.PRESENT);
        assertThat(response.markMethod()).isEqualTo(AttendanceSessionMethod.QR_CODE);
    }

    @Test
    void latestUpdateWinsFromQrPresentToManualAbsent() {
        seedSession(AttendanceSessionMethod.QR_CODE);
        attendanceUpdateService.updateInternalAttendance(
                "qr-service",
                100L,
                new InternalAttendanceUpdateRequest(10L, AttendanceSessionMethod.QR_CODE, "phone-10")
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

    private void seedSession(AttendanceSessionMethod sessionMethod) {
        liveAttendanceSessionStore.initializeSession(
                new LiveAttendanceSessionMeta(
                        100L,
                        77L,
                        List.of(1L),
                        "Distributed Systems",
                        "Room B12",
                        "34.6814",
                        "-1.9086",
                        LocalDateTime.now(),
                        LocalDateTime.now().plusMinutes(30),
                        sessionMethod,
                        AttendanceSessionStatus.ACTIVE
                ),
                List.of(
                        new LiveAttendanceStudentState(
                                10L,
                                1L,
                                "Aya",
                                "Bennani",
                                "aya@ump.ac.ma",
                                "A001",
                                AttendanceStudentStatus.UNKNOWN,
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
                                "A002",
                                AttendanceStudentStatus.UNKNOWN,
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
    }
}
