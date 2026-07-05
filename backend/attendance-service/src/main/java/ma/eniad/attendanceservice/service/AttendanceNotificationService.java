package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.attendanceservice.dto.CreateNotificationRequest;
import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;
import ma.eniad.attendanceservice.entity.enums.NotificationChannel;
import ma.eniad.attendanceservice.messaging.NotificationEventPublisher;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class AttendanceNotificationService {

    private static final String ROLE_STUDENT = "STUDENT";
    private static final String ROLE_TEACHER = "TEACHER";
    private static final String TYPE_SESSION_STARTED = "ATTENDANCE_SESSION_STARTED";
    private static final String TYPE_SESSION_FINALIZED = "ATTENDANCE_SESSION_FINALIZED";
    private static final String TYPE_ATTENDANCE_STATUS_CONFIRMED = "ATTENDANCE_STATUS_CONFIRMED";
    private static final String TYPE_ATTENDANCE_STATUS_UPDATED = "ATTENDANCE_STATUS_UPDATED";
    private static final String TYPE_ABSENCE_RECORDED = "ABSENCE_RECORDED";
    private static final String TYPE_ABSENCE_THRESHOLD_EXCEEDED = "ABSENCE_THRESHOLD_EXCEEDED";
    private static final String ENTITY_ATTENDANCE_SESSION = "ATTENDANCE_SESSION";
    private static final String EVENT_SOURCE = "attendance-service";
    private static final long ABSENCE_WARNING_THRESHOLD = 3L;
    private static final Set<NotificationChannel> DEFAULT_CHANNELS =
            Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL);

    private final NotificationEventPublisher notificationEventPublisher;
    private final AttendanceRecordRepository attendanceRecordRepository;

    public void notifySessionStarted(AttendanceSession session, List<StudentRosterDto> roster) {
        for (StudentRosterDto student : roster) {
            sendSafely(new NotificationRequestedEvent(
                    newEventId(),
                    EVENT_SOURCE,
                    TYPE_SESSION_STARTED,
                    student.studentId(),
                    ROLE_STUDENT,
                    student.email(),
                    studentName(student.firstName(), student.lastName()),
                    "Attendance session started",
                    buildSessionStartedMessage(session),
                    "INFO",
                    ENTITY_ATTENDANCE_SESSION,
                    String.valueOf(session.getId()),
                    DEFAULT_CHANNELS,
                    buildSessionStartedMetadata(session, student),
                    LocalDateTime.now()
            ), "session-start", session.getId(), student.studentId());
        }
    }

    public void notifyFinalizedStudentStatuses(AttendanceSession session, List<AttendanceRecord> persistedRecords) {
        persistedRecords.stream()
                .filter(record -> record.getStatus() == AttendanceStudentStatus.PRESENT
                        || record.getStatus() == AttendanceStudentStatus.ABSENT)
                .forEach(record -> {
                    boolean present = record.getStatus() == AttendanceStudentStatus.PRESENT;
                    sendSafely(new NotificationRequestedEvent(
                            newEventId(),
                            EVENT_SOURCE,
                            present ? TYPE_ATTENDANCE_STATUS_CONFIRMED : TYPE_ABSENCE_RECORDED,
                            record.getStudentId(),
                            ROLE_STUDENT,
                            record.getEmail(),
                            studentName(record.getFirstName(), record.getLastName()),
                            present ? "Attendance confirmed" : "Absence recorded",
                            present ? buildPresenceConfirmedMessage(session) : buildAbsenceMessage(session),
                            present ? "SUCCESS" : "WARNING",
                            ENTITY_ATTENDANCE_SESSION,
                            String.valueOf(session.getId()),
                            DEFAULT_CHANNELS,
                            buildFinalStatusMetadata(session, record),
                            LocalDateTime.now()
                    ), present ? "presence-finalized" : "absence-finalized", session.getId(), record.getStudentId());
                    if (!present) {
                        notifyAbsenceThresholdIfNeeded(session, record);
                    }
                });
    }

    public void notifyFinalizedAbsences(AttendanceSession session, List<AttendanceRecord> persistedRecords) {
        notifyFinalizedStudentStatuses(session, persistedRecords);
    }

    public void notifySessionFinalized(AttendanceSession session) {
        sendSafely(new CreateNotificationRequest(
                session.getTeacherId(),
                ROLE_TEACHER,
                TYPE_SESSION_FINALIZED,
                "SUCCESS",
                "Séance finalisée",
                buildFinalizedMessage(session),
                ENTITY_ATTENDANCE_SESSION,
                String.valueOf(session.getId()),
                buildCountsMetadata(session)
        ), "session-finalized", session.getId(), session.getTeacherId());
    }

    public void notifyAttendanceStatusUpdated(AttendanceSession session, Long studentId, AttendanceStudentStatus status) {
        sendSafely(new CreateNotificationRequest(
                studentId,
                ROLE_STUDENT,
                TYPE_ATTENDANCE_STATUS_UPDATED,
                severityForStatus(status),
                "Attendance status updated",
                buildStatusUpdatedMessage(session, status),
                ENTITY_ATTENDANCE_SESSION,
                String.valueOf(session.getId()),
                "{\"status\":\"" + status.name() + "\"}"
        ), "attendance-status-updated", session.getId(), studentId);
    }

    private void sendSafely(CreateNotificationRequest request, String event, Long sessionId, Long studentId) {
        sendSafely(toEvent(request), event, sessionId, studentId);
    }

    private void sendSafely(NotificationRequestedEvent request, String event, Long sessionId, Long studentId) {
        try {
            notificationEventPublisher.publish(request);
        } catch (RuntimeException ex) {
            log.warn(
                    "Notification publish failed for event={} sessionId={} studentId={}: {}",
                    event,
                    sessionId,
                    studentId,
                    ex.getMessage(),
                    ex
            );
        }
    }

    private NotificationRequestedEvent toEvent(CreateNotificationRequest request) {
        return new NotificationRequestedEvent(
                newEventId(),
                EVENT_SOURCE,
                request.type(),
                request.recipientUserId(),
                request.recipientRole(),
                null,
                null,
                request.title(),
                request.message(),
                request.severity(),
                request.relatedEntityType(),
                request.relatedEntityId(),
                DEFAULT_CHANNELS,
                request.metadataJson(),
                LocalDateTime.now()
        );
    }

    private void notifyAbsenceThresholdIfNeeded(AttendanceSession session, AttendanceRecord record) {
        if (attendanceRecordRepository == null || session.getCourseLabel() == null || session.getCourseLabel().isBlank()) {
            return;
        }

        long absenceCount;
        try {
            absenceCount = attendanceRecordRepository.countFinalizedAbsencesForStudentAndCourse(
                    record.getStudentId(),
                    session.getCourseLabel()
            );
        } catch (RuntimeException ex) {
            log.warn(
                    "Could not calculate finalized absence count for sessionId={} studentId={} course={}: {}",
                    session.getId(),
                    record.getStudentId(),
                    session.getCourseLabel(),
                    ex.getMessage(),
                    ex
            );
            return;
        }

        if (absenceCount <= ABSENCE_WARNING_THRESHOLD) {
            return;
        }

        sendSafely(new NotificationRequestedEvent(
                newEventId(),
                EVENT_SOURCE,
                TYPE_ABSENCE_THRESHOLD_EXCEEDED,
                record.getStudentId(),
                ROLE_STUDENT,
                record.getEmail(),
                studentName(record.getFirstName(), record.getLastName()),
                "Avertissement d'absence",
                buildAbsenceThresholdMessage(session, absenceCount),
                "WARNING",
                ENTITY_ATTENDANCE_SESSION,
                String.valueOf(session.getId()),
                DEFAULT_CHANNELS,
                buildFinalStatusMetadata(session, record, absenceCount),
                LocalDateTime.now()
        ), "absence-threshold-exceeded", session.getId(), record.getStudentId());
    }

    private String buildSessionStartedMessage(AttendanceSession session) {
        String courseLabel = labelOrFallback(session.getCourseLabel(), "your course");
        String roomLabel = labelOrFallback(session.getRoomLabel(), "the assigned room");
        String teacher = labelOrFallback(session.getTeacherFullName(), "your teacher");
        return "A new attendance session for " + courseLabel + " has started in " + roomLabel
                + " with " + teacher + ". Please mark your attendance.";
    }

    private String buildAbsenceMessage(AttendanceSession session) {
        String courseLabel = labelOrFallback(session.getCourseLabel(), "your course");
        String roomLabel = labelOrFallback(session.getRoomLabel(), "the assigned room");
        return "You were marked absent for " + courseLabel + " in " + roomLabel
                + ". Please check your attendance details and submit a justification if applicable.";
    }

    private String buildPresenceConfirmedMessage(AttendanceSession session) {
        String courseLabel = labelOrFallback(session.getCourseLabel(), "your course");
        String roomLabel = labelOrFallback(session.getRoomLabel(), "the assigned room");
        return "Your presence was confirmed for " + courseLabel + " in " + roomLabel + ".";
    }

    private String buildFinalizedMessage(AttendanceSession session) {
        return "Présents: " + safeCount(session.getPresentCount())
                + ", absents: " + safeCount(session.getAbsentCount())
                + ", inconnus: " + safeCount(session.getUnknownCount()) + ".";
    }

    private String buildStatusUpdatedMessage(AttendanceSession session, AttendanceStudentStatus status) {
        String courseLabel = labelOrFallback(session.getCourseLabel(), "your course");
        if (status == AttendanceStudentStatus.PRESENT) {
            return "Your attendance for " + courseLabel + " was corrected to present.";
        }
        if (status == AttendanceStudentStatus.ABSENT) {
            return "Your attendance for " + courseLabel + " was corrected to absent.";
        }
        return "Your attendance for " + courseLabel + " was updated.";
    }

    private String severityForStatus(AttendanceStudentStatus status) {
        if (status == AttendanceStudentStatus.PRESENT) {
            return "SUCCESS";
        }
        if (status == AttendanceStudentStatus.ABSENT) {
            return "WARNING";
        }
        return "INFO";
    }

    private String buildCountsMetadata(AttendanceSession session) {
        return "{\"presentCount\":" + safeCount(session.getPresentCount())
                + ",\"absentCount\":" + safeCount(session.getAbsentCount())
                + ",\"unknownCount\":" + safeCount(session.getUnknownCount()) + "}";
    }

    private String buildAbsenceThresholdMessage(AttendanceSession session, long absenceCount) {
        String courseLabel = labelOrFallback(session.getCourseLabel(), "ce module");
        return "Vous avez depasse le seuil autorise d'absences pour " + courseLabel
                + " avec " + absenceCount
                + " absences finalisees. Veuillez consulter votre espace etudiant et deposer les justificatifs necessaires.";
    }

    private String buildSessionStartedMetadata(AttendanceSession session, StudentRosterDto student) {
        return "{\"sessionId\":" + session.getId()
                + ",\"courseLabel\":\"" + jsonEscape(labelOrFallback(session.getCourseLabel(), "")) + "\""
                + ",\"roomLabel\":\"" + jsonEscape(labelOrFallback(session.getRoomLabel(), "")) + "\""
                + ",\"teacherId\":" + session.getTeacherId()
                + ",\"teacherFullName\":\"" + jsonEscape(labelOrFallback(session.getTeacherFullName(), "")) + "\""
                + ",\"groupId\":" + student.groupId()
                + ",\"startedAt\":\"" + nullSafe(session.getStartedAt()) + "\""
                + ",\"endsAt\":\"" + nullSafe(session.getEndsAt()) + "\"}";
    }

    private String buildFinalStatusMetadata(AttendanceSession session, AttendanceRecord record) {
        return buildFinalStatusMetadata(session, record, null);
    }

    private String buildFinalStatusMetadata(AttendanceSession session, AttendanceRecord record, Long absenceCount) {
        return "{\"sessionId\":" + session.getId()
                + ",\"courseLabel\":\"" + jsonEscape(labelOrFallback(session.getCourseLabel(), "")) + "\""
                + ",\"roomLabel\":\"" + jsonEscape(labelOrFallback(session.getRoomLabel(), "")) + "\""
                + ",\"teacherId\":" + session.getTeacherId()
                + ",\"teacherFullName\":\"" + jsonEscape(labelOrFallback(session.getTeacherFullName(), "")) + "\""
                + ",\"status\":\"" + record.getStatus().name() + "\""
                + (absenceCount == null ? "" : ",\"absenceCount\":" + absenceCount)
                + ",\"absenceThreshold\":" + ABSENCE_WARNING_THRESHOLD
                + ",\"moduleKey\":\"courseLabel\""
                + ",\"finalizedAt\":\"" + nullSafe(session.getEndedAt()) + "\"}";
    }

    private int safeCount(Integer value) {
        return value == null ? 0 : value;
    }

    private String labelOrFallback(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return value.trim();
    }

    private String jsonEscape(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"")
                .replace("\n", "\\n")
                .replace("\r", "\\r");
    }

    private String studentName(String firstName, String lastName) {
        String fullName = (labelOrFallback(firstName, "") + " " + labelOrFallback(lastName, "")).trim();
        return fullName.isBlank() ? null : fullName;
    }

    private String nullSafe(Object value) {
        return value == null ? "" : String.valueOf(value);
    }

    private String newEventId() {
        return UUID.randomUUID().toString();
    }
}
