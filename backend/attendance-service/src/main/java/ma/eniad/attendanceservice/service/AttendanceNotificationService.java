package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.attendanceservice.client.NotificationServiceClient;
import ma.eniad.attendanceservice.dto.CreateNotificationRequest;
import ma.eniad.attendanceservice.dto.StudentRosterDto;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import org.springframework.stereotype.Service;

import java.util.List;

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
    private static final String ENTITY_ATTENDANCE_SESSION = "ATTENDANCE_SESSION";

    private final NotificationServiceClient notificationServiceClient;

    public void notifySessionStarted(AttendanceSession session, List<StudentRosterDto> roster) {
        for (StudentRosterDto student : roster) {
            sendSafely(new CreateNotificationRequest(
                    student.studentId(),
                    ROLE_STUDENT,
                    TYPE_SESSION_STARTED,
                    "INFO",
                    "Attendance session started",
                    buildSessionStartedMessage(session),
                    ENTITY_ATTENDANCE_SESSION,
                    String.valueOf(session.getId()),
                    null
            ), "session-start", session.getId(), student.studentId());
        }
    }

    public void notifyFinalizedStudentStatuses(AttendanceSession session, List<AttendanceRecord> persistedRecords) {
        persistedRecords.stream()
                .filter(record -> record.getStatus() == AttendanceStudentStatus.PRESENT
                        || record.getStatus() == AttendanceStudentStatus.ABSENT)
                .forEach(record -> {
                    boolean present = record.getStatus() == AttendanceStudentStatus.PRESENT;
                    sendSafely(new CreateNotificationRequest(
                            record.getStudentId(),
                            ROLE_STUDENT,
                            present ? TYPE_ATTENDANCE_STATUS_CONFIRMED : TYPE_ABSENCE_RECORDED,
                            present ? "SUCCESS" : "WARNING",
                            present ? "Attendance confirmed" : "Absence recorded",
                            present ? buildPresenceConfirmedMessage(session) : buildAbsenceMessage(session),
                            ENTITY_ATTENDANCE_SESSION,
                            String.valueOf(session.getId()),
                            buildFinalStatusMetadata(session, record)
                    ), present ? "presence-finalized" : "absence-finalized", session.getId(), record.getStudentId());
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
        try {
            notificationServiceClient.createNotification(request);
        } catch (RuntimeException ex) {
            log.warn(
                    "Notification send failed for event={} sessionId={} studentId={}: {}",
                    event,
                    sessionId,
                    studentId,
                    ex.getMessage(),
                    ex
            );
        }
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

    private String buildFinalStatusMetadata(AttendanceSession session, AttendanceRecord record) {
        return "{\"sessionId\":" + session.getId()
                + ",\"courseLabel\":\"" + jsonEscape(labelOrFallback(session.getCourseLabel(), "")) + "\""
                + ",\"roomLabel\":\"" + jsonEscape(labelOrFallback(session.getRoomLabel(), "")) + "\""
                + ",\"teacherId\":" + session.getTeacherId()
                + ",\"teacherFullName\":\"" + jsonEscape(labelOrFallback(session.getTeacherFullName(), "")) + "\""
                + ",\"status\":\"" + record.getStatus().name() + "\""
                + ",\"finalizedAt\":\"" + session.getEndedAt() + "\"}";
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
}
