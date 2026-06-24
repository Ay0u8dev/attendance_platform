package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceUpdateEvent;
import ma.eniad.attendanceservice.dto.AttendanceUpdateResponse;
import ma.eniad.attendanceservice.dto.InternalAttendanceUpdateRequest;
import ma.eniad.attendanceservice.dto.JustificationContextResponse;
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
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AttendanceUpdateService {

    private static final Set<String> TRUSTED_SOURCES = Set.of("qr-service", "face-service");
    private static final String JUSTIFICATION_SOURCE = "justification-service";
    private static final Map<String, AttendanceSessionMethod> SOURCE_METHODS = Map.of(
            "qr-service", AttendanceSessionMethod.QR_CODE,
            "face-service", AttendanceSessionMethod.FACE_ID
    );
    private static final String DEVICE_REQUIRED_MESSAGE = "deviceId is required for student self attendance";
    private static final String GPS_REQUIRED_MESSAGE = "GPS coordinates are required for student self attendance";
    private static final double EARTH_RADIUS_METERS = 6_371_000.0;

    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final SimpMessagingTemplate messagingTemplate;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;
    private final Map<Long, Object> sessionLocks = new ConcurrentHashMap<>();

    @Value("${attendance.self-mark.max-distance-meters:${attendance.qr.max-distance-meters:100}}")
    private double selfMarkMaxDistanceMeters = 100.0;

    @Transactional
    public AttendanceUpdateResponse updateManualAttendance(Long teacherId,
                                                           Long sessionId,
                                                           ManualAttendanceUpdateRequest request) {
        if (request.status() != AttendanceStudentStatus.PRESENT
                && request.status() != AttendanceStudentStatus.ABSENT) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Manual status must be PRESENT or ABSENT");
        }

        AttendanceSession persistedSession = attendanceSessionRepository.findById(sessionId).orElse(null);
        if (persistedSession != null) {
            if (!teacherId.equals(persistedSession.getTeacherId())) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher does not own this session");
            }
            if (persistedSession.getStatus() == AttendanceSessionStatus.FINALIZED) {
                return updateFinalizedAttendance(persistedSession, request);
            }
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

    @Transactional
    public void justifyFinalizedAbsence(String requestSource,
                                        Long sessionId,
                                        Long studentId,
                                        JustifyAbsenceRequest request) {
        requireJustificationSource(requestSource);

        AttendanceRecord record = attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found"));

        if (record.getStatus() == AttendanceStudentStatus.JUSTIFIED) {
            return;
        }

        if (record.getStatus() != AttendanceStudentStatus.ABSENT) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only absent attendance records can be justified");
        }

        record.setStatus(AttendanceStudentStatus.JUSTIFIED);
        try {
            attendanceRecordRepository.saveAndFlush(record);
        } catch (DataIntegrityViolationException ex) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Attendance record status JUSTIFIED is not accepted by the current database schema",
                    ex
            );
        }

        attendanceSessionRepository.findById(sessionId).ifPresent(session -> updateSessionCounts(session, sessionId));
    }

    @Transactional(readOnly = true)
    public JustificationContextResponse getJustificationContext(String requestSource,
                                                                Long sessionId,
                                                                Long studentId) {
        requireJustificationSource(requestSource);

        AttendanceRecord record = attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found"));
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance session not found"));

        return new JustificationContextResponse(
                record.getId(),
                session.getId(),
                record.getStudentId(),
                record.getGroupId(),
                session.getTeacherId(),
                session.getTeacherFullName(),
                (record.getFirstName() + " " + record.getLastName()).trim(),
                record.getEmail(),
                record.getNumApogee(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                session.getStartedAt(),
                session.getEndedAt() != null ? session.getEndedAt() : session.getEndsAt(),
                record.getStatus()
        );
    }

    private AttendanceUpdateResponse updateFinalizedAttendance(AttendanceSession session,
                                                               ManualAttendanceUpdateRequest request) {
        AttendanceRecord record = attendanceRecordRepository.findBySessionIdAndStudentId(session.getId(), request.studentId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found"));

        LocalDateTime now = LocalDateTime.now();
        record.setStatus(request.status());
        record.setMarkMethod(AttendanceSessionMethod.MANUAL);
        record.setMarkedAt(now);
        attendanceRecordRepository.save(record);

        AttendanceCounts counts = updateSessionCounts(session, session.getId());

        return new AttendanceUpdateResponse(
                session.getId(),
                record.getStudentId(),
                record.getStatus(),
                record.getMarkMethod(),
                record.getMarkedAt(),
                counts.presentCount(),
                counts.absentCount(),
                counts.unknownCount()
        );
    }

    private AttendanceCounts recalculateFinalizedCounts(Long sessionId) {
        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdOrderByStudentIdAsc(sessionId);
        int presentCount = 0;
        int absentCount = 0;
        int unknownCount = 0;

        for (AttendanceRecord record : records) {
            if (record.getStatus() == AttendanceStudentStatus.PRESENT) {
                presentCount++;
            } else if (record.getStatus() == AttendanceStudentStatus.ABSENT) {
                absentCount++;
            } else if (record.getStatus() == AttendanceStudentStatus.UNKNOWN) {
                unknownCount++;
            }
        }

        return new AttendanceCounts(presentCount, absentCount, unknownCount);
    }

    private AttendanceCounts updateSessionCounts(AttendanceSession session, Long sessionId) {
        AttendanceCounts counts = recalculateFinalizedCounts(sessionId);
        session.setPresentCount(counts.presentCount());
        session.setAbsentCount(counts.absentCount());
        session.setUnknownCount(counts.unknownCount());
        attendanceSessionRepository.save(session);
        return counts;
    }

    private void requireJustificationSource(String requestSource) {
        if (!JUSTIFICATION_SOURCE.equals(requestSource)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Untrusted request source");
        }
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
