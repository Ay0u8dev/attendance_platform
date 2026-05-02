package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.config.AttendanceSessionProperties;
import ma.eniad.attendanceservice.dto.AttendanceCounts;
import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.dto.LiveAttendanceSessionMeta;
import ma.eniad.attendanceservice.dto.LiveAttendanceStudentState;
import ma.eniad.attendanceservice.dto.SessionFinalizedEvent;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class AttendanceFinalizationService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final AttendanceSessionReadService attendanceSessionReadService;
    private final AttendanceSessionProperties attendanceSessionProperties;
    private final SimpMessagingTemplate messagingTemplate;
    private final Map<Long, Object> sessionLocks = new ConcurrentHashMap<>();

    @Transactional
    public AttendanceSessionDetailsResponse finalizeSession(Long sessionId, Long teacherId) {
        return withSessionLock(sessionId, () -> {
            AttendanceSession session = attendanceSessionRepository.findByIdAndTeacherId(sessionId, teacherId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
            if (session.getStatus() == AttendanceSessionStatus.FINALIZED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is already finalized");
            }

            finalizeSessionInternal(session);
            return attendanceSessionReadService.getSession(sessionId, teacherId);
        });
    }

    @Scheduled(fixedDelayString = "${attendance.session.auto-finalize-poll-interval}")
    @Transactional
    public void finalizeExpiredSessions() {
        List<AttendanceSession> expiredSessions = attendanceSessionRepository.findAllByStatusAndEndsAtLessThanEqual(
                AttendanceSessionStatus.ACTIVE,
                LocalDateTime.now()
        );

        for (AttendanceSession session : expiredSessions) {
            withSessionLock(session.getId(), () -> {
                AttendanceSession reloadedSession = attendanceSessionRepository.findById(session.getId()).orElse(null);
                if (reloadedSession == null || reloadedSession.getStatus() == AttendanceSessionStatus.FINALIZED) {
                    return null;
                }
                finalizeSessionInternal(reloadedSession);
                return null;
            });
        }
    }

    private void finalizeSessionInternal(AttendanceSession session) {
        LiveAttendanceSessionMeta meta = liveAttendanceSessionStore.findSessionMeta(session.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Live session state not found"));
        List<LiveAttendanceStudentState> currentStudents = liveAttendanceSessionStore.findAllStudentStates(session.getId());

        List<LiveAttendanceStudentState> finalizedStudents = currentStudents.stream()
                .map(student -> student.status() == AttendanceStudentStatus.UNKNOWN
                        ? new LiveAttendanceStudentState(
                        student.studentId(),
                        student.groupId(),
                        student.firstName(),
                        student.lastName(),
                        student.email(),
                        student.pfpUrl(),
                        student.numApogee(),
                        AttendanceStudentStatus.ABSENT,
                        null,
                        null,
                        null,
                        null,
                        null
                )
                        : student)
                .toList();

        attendanceRecordRepository.deleteBySessionId(session.getId());
        attendanceRecordRepository.saveAll(finalizedStudents.stream()
                .map(student -> AttendanceRecord.builder()
                        .sessionId(session.getId())
                        .studentId(student.studentId())
                        .groupId(student.groupId())
                        .firstName(student.firstName())
                        .lastName(student.lastName())
                        .email(student.email())
                        .pfpUrl(student.pfpUrl())
                        .numApogee(student.numApogee())
                        .status(student.status())
                        .markMethod(student.markMethod())
                        .markedAt(student.markedAt())
                        .deviceId(student.deviceId())
                        .markedGpsLat(student.markedGpsLat())
                        .markedGpsLon(student.markedGpsLon())
                        .build())
                .toList());

        AttendanceCounts counts = computeCounts(finalizedStudents);
        session.setStatus(AttendanceSessionStatus.FINALIZED);
        session.setEndedAt(LocalDateTime.now());
        session.setPresentCount(counts.presentCount());
        session.setAbsentCount(counts.absentCount());
        session.setUnknownCount(counts.unknownCount());
        attendanceSessionRepository.save(session);

        LiveAttendanceSessionMeta finalizedMeta = new LiveAttendanceSessionMeta(
                meta.sessionId(),
                meta.teacherId(),
                meta.groupIds(),
                meta.courseLabel(),
                meta.roomLabel(),
                meta.gpsLat(),
                meta.gpsLon(),
                meta.startedAt(),
                meta.endsAt(),
                meta.method(),
                AttendanceSessionStatus.FINALIZED
        );
        liveAttendanceSessionStore.finalizeSession(
                finalizedMeta,
                finalizedStudents,
                attendanceSessionProperties.finalizedStateRetention()
        );

        messagingTemplate.convertAndSend(
                "/topic/attendance.sessions." + session.getId(),
                new SessionFinalizedEvent(
                        "SESSION_FINALIZED",
                        session.getId(),
                        AttendanceSessionStatus.FINALIZED,
                        counts.presentCount(),
                        counts.absentCount(),
                        counts.unknownCount()
                )
        );
    }

    private AttendanceCounts computeCounts(List<LiveAttendanceStudentState> students) {
        int present = 0;
        int absent = 0;
        int unknown = 0;
        for (LiveAttendanceStudentState student : students) {
            if (student.status() == AttendanceStudentStatus.PRESENT) {
                present++;
            } else if (student.status() == AttendanceStudentStatus.ABSENT) {
                absent++;
            } else {
                unknown++;
            }
        }
        return new AttendanceCounts(present, absent, unknown);
    }

    private <T> T withSessionLock(Long sessionId, LockedOperation<T> operation) {
        Object lock = sessionLocks.computeIfAbsent(sessionId, ignored -> new Object());
        synchronized (lock) {
            return operation.execute();
        }
    }

    @FunctionalInterface
    private interface LockedOperation<T> {
        T execute();
    }
}
