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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.Map;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;

@Service
public class AttendanceUpdateService {

    private static final Map<String, AttendanceSessionMethod> SOURCE_METHODS = Map.of(
            "qr-service", AttendanceSessionMethod.QR_CODE,
            "face-service", AttendanceSessionMethod.FACE_ID
    );
    private static final String DEVICE_REQUIRED_MESSAGE = "deviceId is required for student self attendance";
    private static final String GPS_REQUIRED_MESSAGE = "GPS coordinates are required for student self attendance";
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final SimpMessagingTemplate messagingTemplate;
    private final AttendanceSessionLock sessionLock;

    @Value("${attendance.internal.face-service-token:}")
    private String faceServiceToken;

    @Value("${attendance.internal.qr-service-token:}")
    private String qrServiceToken;

    @Value("${attendance.self-mark.max-distance-meters:${attendance.qr.max-distance-meters:100}}")
    private double selfMarkMaxDistanceMeters = 100.0;

    @Autowired
    public AttendanceUpdateService(LiveAttendanceSessionStore store, SimpMessagingTemplate messagingTemplate,
                                   AttendanceSessionLock sessionLock) {
        this.liveAttendanceSessionStore = store;
        this.messagingTemplate = messagingTemplate;
        this.sessionLock = sessionLock;
    }

    AttendanceUpdateService(LiveAttendanceSessionStore store, SimpMessagingTemplate messagingTemplate) {
        this(store, messagingTemplate, directLock());
        this.faceServiceToken = "test-internal-token";
        this.qrServiceToken = "test-internal-token";
    }

    private static AttendanceSessionLock directLock() {
        return new AttendanceSessionLock() {
            @Override
            public <T> T execute(Long sessionId, java.util.function.Supplier<T> operation) {
                return operation.get();
            }
        };
    }

    public AttendanceUpdateResponse updateManualAttendance(Long teacherId,
                                                           Long sessionId,
                                                           ManualAttendanceUpdateRequest request) {
        if (request.status() == AttendanceStudentStatus.UNKNOWN) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual status must be PRESENT or ABSENT");
        }

        return sessionLock.execute(sessionId, () -> {
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
                                                             String internalToken,
                                                             Long sessionId,
                                                             InternalAttendanceUpdateRequest request) {
        if (requestSource == null || !SOURCE_METHODS.containsKey(requestSource)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Untrusted request source");
        }
        validateInternalToken(requestSource, internalToken);

        AttendanceSessionMethod expectedMethod = SOURCE_METHODS.get(requestSource);
        if (expectedMethod != request.method()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Request source does not match attendance method");
        }

        return sessionLock.execute(sessionId, () -> {
            LiveAttendanceSessionMeta sessionMeta = requireActiveSession(sessionId);
            LiveAttendanceStudentState currentStudent = requireStudent(sessionId, request.studentId());
            AttendanceMarkData markData = resolveMarkData(request, sessionMeta);
            if (currentStudent.status() != AttendanceStudentStatus.UNKNOWN) {
                if (currentStudent.status() == AttendanceStudentStatus.PRESENT
                        && currentStudent.markMethod() == request.method()
                        && markData.deviceId().equals(normalizeOptional(currentStudent.deviceId()))) {
                    return buildResponse(sessionId, currentStudent, false);
                }
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Student attendance is already resolved");
            }

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

            liveAttendanceSessionStore.saveStudentStateAndBindDevice(
                    sessionId, updatedStudent, markData.deviceId(), request.studentId());
            return buildResponse(sessionId, updatedStudent, true);
        });
    }

    AttendanceUpdateResponse updateInternalAttendance(String requestSource, Long sessionId,
                                                       InternalAttendanceUpdateRequest request) {
        String token = "face-service".equals(requestSource) ? faceServiceToken : qrServiceToken;
        return updateInternalAttendance(requestSource, token, sessionId, request);
    }

    private LiveAttendanceSessionMeta requireActiveSession(Long sessionId) {
        LiveAttendanceSessionMeta sessionMeta = liveAttendanceSessionStore.findSessionMeta(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (sessionMeta.status() != AttendanceSessionStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is not active");
        }
        if (!sessionMeta.endsAt().isAfter(LocalDateTime.now())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Session has expired");
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

    private AttendanceUpdateResponse buildResponse(Long sessionId, LiveAttendanceStudentState student, boolean broadcast) {
        if (broadcast) {
            return buildResponseAndBroadcast(sessionId, student);
        }
        AttendanceCounts counts = liveAttendanceSessionStore.getAttendanceCounts(sessionId);
        return new AttendanceUpdateResponse(sessionId, student.studentId(), student.status(), student.markMethod(),
                student.markedAt(), counts.presentCount(), counts.absentCount(), counts.unknownCount());
    }

    private void validateInternalToken(String source, String suppliedToken) {
        String expectedToken = "face-service".equals(source) ? faceServiceToken : qrServiceToken;
        if (expectedToken == null || expectedToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Internal authentication is not configured");
        }
        byte[] supplied = suppliedToken == null ? new byte[0] : suppliedToken.getBytes(StandardCharsets.UTF_8);
        if (!MessageDigest.isEqual(expectedToken.getBytes(StandardCharsets.UTF_8), supplied)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service credentials");
        }
    }

    private AttendanceMarkData resolveMarkData(InternalAttendanceUpdateRequest request,
                                               LiveAttendanceSessionMeta sessionMeta) {
        if (isStudentSelfMarkMethod(request.method())) {
            String deviceId = requireNonBlank(request.deviceId(), DEVICE_REQUIRED_MESSAGE);
            if (deviceId.length() > 128) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "deviceId is too long");
            }
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
        double teacherLat = parseCoordinate(sessionMeta.gpsLat(), "Session GPS latitude is invalid", -90, 90);
        double teacherLon = parseCoordinate(sessionMeta.gpsLon(), "Session GPS longitude is invalid", -180, 180);
        double studentLat = parseCoordinate(studentGpsLat, "Student GPS latitude is invalid", -90, 90);
        double studentLon = parseCoordinate(studentGpsLon, "Student GPS longitude is invalid", -180, 180);
        double distance = distanceMeters(teacherLat, teacherLon, studentLat, studentLon);
        if (!Double.isFinite(distance) || distance > selfMarkMaxDistanceMeters) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Student is too far from the attendance session location");
        }
    }

    private double parseCoordinate(String value, String message, double min, double max) {
        try {
            double coordinate = Double.parseDouble(requireNonBlank(value, message));
            if (!Double.isFinite(coordinate) || coordinate < min || coordinate > max) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
            }
            return coordinate;
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

    private record AttendanceMarkData(String deviceId, String gpsLat, String gpsLon) {
    }

}
