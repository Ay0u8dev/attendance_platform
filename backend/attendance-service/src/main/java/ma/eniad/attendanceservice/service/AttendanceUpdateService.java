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
import org.springframework.beans.factory.annotation.Value;
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
    private static final String DEVICE_REQUIRED_MESSAGE = "deviceId is required for student self attendance";
    private static final String GPS_REQUIRED_MESSAGE = "GPS coordinates are required for student self attendance";
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<Long, Object> sessionLocks = new ConcurrentHashMap<>();

    @Value("${attendance.self-mark.max-distance-meters:${attendance.qr.max-distance-meters:100}}")
    private double selfMarkMaxDistanceMeters = 100.0;

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

            LiveAttendanceStudentState currentStudent = requireStudent(sessionId, request.studentId());
            if (currentStudent.status() != AttendanceStudentStatus.UNKNOWN) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Student attendance is already resolved");
            }
            AttendanceMarkData markData = resolveMarkData(request, sessionMeta);

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
            liveAttendanceSessionStore.bindDeviceToStudent(sessionId, markData.deviceId(), request.studentId());
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

    private AttendanceMarkData resolveMarkData(InternalAttendanceUpdateRequest request,
                                               LiveAttendanceSessionMeta sessionMeta) {
        if (isStudentSelfMarkMethod(request.method())) {
            String deviceId = requireNonBlank(request.deviceId(), DEVICE_REQUIRED_MESSAGE);
            String gpsLat = requireNonBlank(request.gpsLat(), GPS_REQUIRED_MESSAGE);
            String gpsLon = requireNonBlank(request.gpsLon(), GPS_REQUIRED_MESSAGE);
            validateSelfMarkDistance(sessionMeta, gpsLat, gpsLon);
            return new AttendanceMarkData(deviceId, gpsLat, gpsLon);
        }

        throw new ResponseStatusException(HttpStatus.CONFLICT, "Attendance method does not support internal updates");
    }

    private boolean isStudentSelfMarkMethod(AttendanceSessionMethod method) {
        return method == AttendanceSessionMethod.QR_CODE || method == AttendanceSessionMethod.FACE_ID;
    }

    private void validateSelfMarkDistance(LiveAttendanceSessionMeta sessionMeta, String studentGpsLat, String studentGpsLon) {
        double teacherLat = parseCoordinate(sessionMeta.gpsLat(), "Session GPS latitude is invalid");
        double teacherLon = parseCoordinate(sessionMeta.gpsLon(), "Session GPS longitude is invalid");
        double studentLat = parseCoordinate(studentGpsLat, "Student GPS latitude is invalid");
        double studentLon = parseCoordinate(studentGpsLon, "Student GPS longitude is invalid");
        double distance = distanceMeters(teacherLat, teacherLon, studentLat, studentLon);
        if (distance > selfMarkMaxDistanceMeters) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is too far from the attendance session location");
        }
    }

    private double parseCoordinate(String value, String message) {
        try {
            return Double.parseDouble(requireNonBlank(value, message));
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
    }

    private double distanceMeters(double lat1, double lon1, double lat2, double lon2) {
        double latDistance = Math.toRadians(lat2 - lat1);
        double lonDistance = Math.toRadians(lon2 - lon1);
        double a = Math.sin(latDistance / 2) * Math.sin(latDistance / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(lonDistance / 2) * Math.sin(lonDistance / 2);
        double c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return EARTH_RADIUS_METERS * c;
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
