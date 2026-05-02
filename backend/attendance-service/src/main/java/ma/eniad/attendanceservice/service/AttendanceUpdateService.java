package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
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
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AttendanceUpdateService {

    private static final Set<String> TRUSTED_SOURCES = Set.of("qr-service", "face-service");
    private static final Map<String, AttendanceSessionMethod> SOURCE_METHODS = Map.of(
            "qr-service", AttendanceSessionMethod.QR_CODE,
            "face-service", AttendanceSessionMethod.FACE_ID
    );
    private static final String QR_DEVICE_REQUIRED_MESSAGE = "deviceId is required for QR_CODE attendance";
    private static final String QR_GPS_REQUIRED_MESSAGE = "gpsLat and gpsLon are required for QR_CODE attendance";

    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<Long, Object> sessionLocks = new ConcurrentHashMap<>();

    public AttendanceUpdateResponse updateManualAttendance(Long teacherId,
                                                           Long sessionId,
                                                           ManualAttendanceUpdateRequest request) {
        if (request.status() == AttendanceStudentStatus.UNKNOWN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual status must be PRESENT or ABSENT");
        }

        return withSessionLock(sessionId, () -> {
            LiveAttendanceSessionMeta sessionMeta = requireActiveSession(sessionId);
            if (!teacherId.equals(sessionMeta.teacherId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher does not own this session");
            }

            LiveAttendanceStudentState currentStudent = requireStudent(sessionId, request.studentId());
            LocalDateTime now = LocalDateTime.now();
            LiveAttendanceStudentState updatedStudent = new LiveAttendanceStudentState(
                    currentStudent.studentId(),
                    currentStudent.groupId(),
                    currentStudent.firstName(),
                    currentStudent.lastName(),
                    currentStudent.email(),
                    currentStudent.pfpUrl(),
                    currentStudent.numApogee(),
                    request.status(),
                    now,
                    AttendanceSessionMethod.MANUAL,
                    null,
                    null,
                    null
            );

            liveAttendanceSessionStore.saveStudentState(sessionId, updatedStudent);
            return buildResponseAndBroadcast(sessionId, updatedStudent);
        });
    }

    public AttendanceUpdateResponse updateInternalAttendance(String requestSource,
                                                             Long sessionId,
                                                             InternalAttendanceUpdateRequest request) {
        if (requestSource == null || !TRUSTED_SOURCES.contains(requestSource)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Untrusted request source");
        }

        AttendanceSessionMethod expectedMethod = SOURCE_METHODS.get(requestSource);
        if (expectedMethod != request.method()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request source does not match attendance method");
        }

        return withSessionLock(sessionId, () -> {
            LiveAttendanceSessionMeta sessionMeta = requireActiveSession(sessionId);
            if (sessionMeta.method() != request.method()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance method does not match session mode");
            }

            LiveAttendanceStudentState currentStudent = requireStudent(sessionId, request.studentId());
            AttendanceMarkData markData = resolveMarkData(request);

            if (request.method() == AttendanceSessionMethod.QR_CODE) {
                liveAttendanceSessionStore.findDeviceIdByStudent(sessionId, request.studentId())
                        .filter(existingDeviceId -> !existingDeviceId.equals(markData.deviceId()))
                        .ifPresent(existingDeviceId -> {
                            throw new ResponseStatusException(
                                    HttpStatus.CONFLICT,
                                    "Student is already bound to another device in this session"
                            );
                        });

                liveAttendanceSessionStore.findStudentIdByDevice(sessionId, markData.deviceId())
                        .filter(existingStudentId -> !existingStudentId.equals(request.studentId()))
                        .ifPresent(existingStudentId -> {
                            throw new ResponseStatusException(
                                    HttpStatus.CONFLICT,
                                    "Device is already used by another student in this session"
                            );
                        });
            }

            LocalDateTime now = LocalDateTime.now();
            LiveAttendanceStudentState updatedStudent = new LiveAttendanceStudentState(
                    currentStudent.studentId(),
                    currentStudent.groupId(),
                    currentStudent.firstName(),
                    currentStudent.lastName(),
                    currentStudent.email(),
                    currentStudent.pfpUrl(),
                    currentStudent.numApogee(),
                    AttendanceStudentStatus.PRESENT,
                    now,
                    request.method(),
                    markData.deviceId(),
                    markData.gpsLat(),
                    markData.gpsLon()
            );

            liveAttendanceSessionStore.saveStudentState(sessionId, updatedStudent);
            if (request.method() == AttendanceSessionMethod.QR_CODE) {
                liveAttendanceSessionStore.bindDeviceToStudent(sessionId, markData.deviceId(), request.studentId());
            }
            return buildResponseAndBroadcast(sessionId, updatedStudent);
        });
    }

    private LiveAttendanceSessionMeta requireActiveSession(Long sessionId) {
        LiveAttendanceSessionMeta sessionMeta = liveAttendanceSessionStore.findSessionMeta(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (sessionMeta.status() != AttendanceSessionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is not active");
        }
        return sessionMeta;
    }

    private LiveAttendanceStudentState requireStudent(Long sessionId, Long studentId) {
        return liveAttendanceSessionStore.findStudentState(sessionId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Student not found in session"));
    }

    private AttendanceUpdateResponse buildResponseAndBroadcast(Long sessionId, LiveAttendanceStudentState updatedStudent) {
        AttendanceCounts counts = liveAttendanceSessionStore.getAttendanceCounts(sessionId);
        AttendanceUpdateResponse response = new AttendanceUpdateResponse(
                sessionId,
                updatedStudent.studentId(),
                updatedStudent.status(),
                updatedStudent.markMethod(),
                updatedStudent.deviceId(),
                updatedStudent.markedGpsLat(),
                updatedStudent.markedGpsLon(),
                updatedStudent.markedAt(),
                counts.presentCount(),
                counts.absentCount(),
                counts.unknownCount()
        );

        messagingTemplate.convertAndSend(
                "/topic/attendance.sessions." + sessionId,
                new AttendanceUpdateEvent(
                        "ATTENDANCE_UPDATED",
                        sessionId,
                        updatedStudent.studentId(),
                        updatedStudent.status(),
                        updatedStudent.markMethod(),
                        updatedStudent.deviceId(),
                        updatedStudent.markedGpsLat(),
                        updatedStudent.markedGpsLon(),
                        updatedStudent.markedAt(),
                        counts.presentCount(),
                        counts.absentCount(),
                        counts.unknownCount()
                )
        );

        return response;
    }

    private AttendanceUpdateResponse withSessionLock(Long sessionId, UpdateOperation operation) {
        Object lock = sessionLocks.computeIfAbsent(sessionId, ignored -> new Object());
        synchronized (lock) {
            return operation.execute();
        }
    }

    private AttendanceMarkData resolveMarkData(InternalAttendanceUpdateRequest request) {
        if (request.method() == AttendanceSessionMethod.QR_CODE) {
            String deviceId = requireNonBlank(request.deviceId(), QR_DEVICE_REQUIRED_MESSAGE);
            String gpsLat = requireNonBlank(request.gpsLat(), QR_GPS_REQUIRED_MESSAGE);
            String gpsLon = requireNonBlank(request.gpsLon(), QR_GPS_REQUIRED_MESSAGE);
            return new AttendanceMarkData(deviceId, gpsLat, gpsLon);
        }

        if (request.method() == AttendanceSessionMethod.FACE_ID) {
            return new AttendanceMarkData(
                    normalizeOptional(request.deviceId()),
                    normalizeOptional(request.gpsLat()),
                    normalizeOptional(request.gpsLon())
            );
        }

        throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance method does not support internal updates");
    }

    private String requireNonBlank(String value, String message) {
        String normalized = normalizeOptional(value);
        if (normalized == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return normalized;
    }

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }

    @FunctionalInterface
    private interface UpdateOperation {
        AttendanceUpdateResponse execute();
    }

    private record AttendanceMarkData(String deviceId, String gpsLat, String gpsLon) {
    }
}
