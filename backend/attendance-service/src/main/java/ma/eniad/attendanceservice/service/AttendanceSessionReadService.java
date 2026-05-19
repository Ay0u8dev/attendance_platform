package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.AttendanceStudentView;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.Comparator;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AttendanceSessionReadService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;

    public AttendanceSessionDetailsResponse getSession(Long sessionId, Long teacherId) {
        AttendanceSession session = attendanceSessionRepository.findByIdAndTeacherId(sessionId, teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (session.getStatus() == AttendanceSessionStatus.ACTIVE) {
            return buildActiveResponse(sessionId, teacherId);
        }

        return buildFinalizedResponse(session);
    }

    public AttendanceSessionDetailsResponse getSessionForAdmin(Long sessionId) {
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));

        if (session.getStatus() == AttendanceSessionStatus.ACTIVE) {
            return buildActiveResponseForAdmin(sessionId);
        }

        return buildFinalizedResponse(session);
    }

    private AttendanceSessionDetailsResponse buildActiveResponse(Long sessionId, Long teacherId) {
        LiveAttendanceSessionMeta meta = liveAttendanceSessionStore.findSessionMeta(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Live session state not found"));
        if (!teacherId.equals(meta.teacherId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher does not own this session");
        }

        List<AttendanceStudentView> students = liveAttendanceSessionStore.findAllStudentStates(sessionId).stream()
                .sorted(Comparator.comparing(LiveAttendanceStudentState::studentId))
                .map(this::toStudentView)
                .toList();

        AttendanceCounts counts = liveAttendanceSessionStore.getAttendanceCounts(sessionId);
        return new AttendanceSessionDetailsResponse(
                meta.sessionId(),
                meta.teacherId(),
                meta.teacherFullName(),
                meta.groupIds(),
                meta.courseLabel(),
                meta.roomLabel(),
                meta.gpsLat(),
                meta.gpsLon(),
                meta.startedAt(),
                meta.endsAt(),
                null,
                meta.method(),
                meta.status(),
                counts.presentCount(),
                counts.absentCount(),
                counts.unknownCount(),
                students
        );
    }

    private AttendanceSessionDetailsResponse buildActiveResponseForAdmin(Long sessionId) {
        LiveAttendanceSessionMeta meta = liveAttendanceSessionStore.findSessionMeta(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Live session state not found"));

        List<AttendanceStudentView> students = liveAttendanceSessionStore.findAllStudentStates(sessionId).stream()
                .sorted(Comparator.comparing(LiveAttendanceStudentState::studentId))
                .map(this::toStudentView)
                .toList();

        AttendanceCounts counts = liveAttendanceSessionStore.getAttendanceCounts(sessionId);
        return new AttendanceSessionDetailsResponse(
                meta.sessionId(),
                meta.teacherId(),
                meta.teacherFullName(),
                meta.groupIds(),
                meta.courseLabel(),
                meta.roomLabel(),
                meta.gpsLat(),
                meta.gpsLon(),
                meta.startedAt(),
                meta.endsAt(),
                null,
                meta.method(),
                meta.status(),
                counts.presentCount(),
                counts.absentCount(),
                counts.unknownCount(),
                students
        );
    }

    private AttendanceSessionDetailsResponse buildFinalizedResponse(AttendanceSession session) {
        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdOrderByStudentIdAsc(session.getId());

        List<AttendanceStudentView> students = records.stream()
                .map(record -> new AttendanceStudentView(
                        record.getStudentId(),
                        record.getGroupId(),
                        record.getFirstName(),
                        record.getLastName(),
                        record.getEmail(),
                        record.getPfpUrl(),
                        record.getNumApogee(),
                        record.getStatus(),
                        record.getMarkMethod(),
                        record.getDeviceId(),
                        record.getMarkedGpsLat(),
                        record.getMarkedGpsLon(),
                        record.getMarkedAt()
                ))
                .toList();

        return new AttendanceSessionDetailsResponse(
                session.getId(),
                session.getTeacherId(),
                session.getTeacherFullName(),
                session.getGroupIds() != null ? List.copyOf(session.getGroupIds()) : List.of(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                session.getGpsLat(),
                session.getGpsLon(),
                session.getStartedAt(),
                session.getEndsAt(),
                session.getEndedAt(),
                session.getMethod(),
                session.getStatus(),
                session.getPresentCount(),
                session.getAbsentCount(),
                session.getUnknownCount(),
                students
        );
    }

    private AttendanceStudentView toStudentView(LiveAttendanceStudentState student) {
        return new AttendanceStudentView(
                student.studentId(),
                student.groupId(),
                student.firstName(),
                student.lastName(),
                student.email(),
                student.pfpUrl(),
                student.numApogee(),
                student.status(),
                student.markMethod(),
                student.deviceId(),
                student.markedGpsLat(),
                student.markedGpsLon(),
                student.markedAt()
        );
    }
}
