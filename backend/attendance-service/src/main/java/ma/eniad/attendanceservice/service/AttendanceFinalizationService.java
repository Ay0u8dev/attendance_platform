package ma.eniad.attendanceservice.service;

import ma.eniad.attendanceservice.config.AttendanceSessionProperties;
import ma.eniad.attendanceservice.dto.*;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceSessionStatus;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Supplier;

@Service
public class AttendanceFinalizationService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final AttendanceSessionReadService attendanceSessionReadService;
    private final AttendanceSessionProperties attendanceSessionProperties;
    private final SimpMessagingTemplate messagingTemplate;
    private final AttendanceSessionLock sessionLock;
    private final TransactionTemplate transactionTemplate;
    private final AttendanceNotificationService attendanceNotificationService;

    @Autowired
    public AttendanceFinalizationService(AttendanceSessionRepository sessions,
                                         AttendanceRecordRepository records,
                                         LiveAttendanceSessionStore store,
                                         AttendanceSessionReadService readService,
                                         AttendanceSessionProperties properties,
                                         SimpMessagingTemplate messagingTemplate,
                                         AttendanceSessionLock sessionLock,
                                         TransactionTemplate transactionTemplate,
                                         AttendanceNotificationService attendanceNotificationService) {
        this.attendanceSessionRepository = sessions;
        this.attendanceRecordRepository = records;
        this.liveAttendanceSessionStore = store;
        this.attendanceSessionReadService = readService;
        this.attendanceSessionProperties = properties;
        this.messagingTemplate = messagingTemplate;
        this.sessionLock = sessionLock;
        this.transactionTemplate = transactionTemplate;
        this.attendanceNotificationService = attendanceNotificationService;
    }

    AttendanceFinalizationService(AttendanceSessionRepository sessions,
                                  AttendanceRecordRepository records,
                                  LiveAttendanceSessionStore store,
                                  AttendanceSessionReadService readService,
                                  AttendanceSessionProperties properties,
                                  SimpMessagingTemplate messagingTemplate) {
        this(sessions, records, store, readService, properties, messagingTemplate,
                directLock(), null, null);
    }

    static AttendanceSessionLock directLock() {
        return new AttendanceSessionLock() {
            @Override
            public <T> T execute(Long sessionId, Supplier<T> operation) {
                return operation.get();
            }
        };
    }

    public AttendanceSessionDetailsResponse finalizeSession(Long sessionId, Long teacherId) {
        return sessionLock.execute(sessionId, () -> inTransaction(() -> {
            AttendanceSession session = attendanceSessionRepository.findByIdAndTeacherId(sessionId, teacherId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
            if (session.getStatus() == AttendanceSessionStatus.FINALIZED) {
                throw new ResponseStatusException(HttpStatus.CONFLICT, "Session is already finalized");
            }

            finalizeSessionInternal(session);
            return attendanceSessionReadService.getSession(sessionId, teacherId);
        }));
    }

    @Scheduled(fixedDelayString = "${attendance.session.auto-finalize-poll-interval}")
    public void finalizeExpiredSessions() {
        List<AttendanceSession> expiredSessions = attendanceSessionRepository.findAllByStatusAndEndsAtLessThanEqual(
                AttendanceSessionStatus.ACTIVE,
                LocalDateTime.now()
        );

        for (AttendanceSession session : expiredSessions) {
            sessionLock.execute(session.getId(), () -> inTransaction(() -> {
                AttendanceSession reloadedSession = attendanceSessionRepository.findById(session.getId()).orElse(null);
                if (reloadedSession == null || reloadedSession.getStatus() == AttendanceSessionStatus.FINALIZED) {
                    return null;
                }
                finalizeSessionInternal(reloadedSession);
                return null;
            }));
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
                        student.filiere(),
                        student.groupeName(),
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
        List<AttendanceRecord> recordsToPersist = finalizedStudents.stream()
                .map(student -> AttendanceRecord.builder()
                        .sessionId(session.getId())
                        .studentId(student.studentId())
                        .groupId(student.groupId())
                        .firstName(student.firstName())
                        .lastName(student.lastName())
                        .email(student.email())
                        .pfpUrl(student.pfpUrl())
                        .numApogee(student.numApogee())
                        .filiere(student.filiere())
                        .groupeName(student.groupeName())
                        .status(student.status())
                        .markMethod(student.markMethod())
                        .markedAt(student.markedAt())
                        .build())
                .toList();
        List<AttendanceRecord> persistedRecords = attendanceRecordRepository.saveAll(recordsToPersist);

        AttendanceCounts counts = computeCounts(finalizedStudents);
        session.setStatus(AttendanceSessionStatus.FINALIZED);
        session.setEndedAt(LocalDateTime.now());
        session.setPresentCount(counts.presentCount());
        session.setAbsentCount(counts.absentCount());
        session.setUnknownCount(counts.unknownCount());
        attendanceSessionRepository.save(session);

        notifyFinalizationAfterCommit(session, persistedRecords);

        LiveAttendanceSessionMeta finalizedMeta = new LiveAttendanceSessionMeta(
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

    private void notifyFinalizationAfterCommit(AttendanceSession session, List<AttendanceRecord> persistedRecords) {
        if (attendanceNotificationService == null) {
            return;
        }

        List<AttendanceRecord> notificationRecords = List.copyOf(persistedRecords);
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            attendanceNotificationService.notifyFinalizedStudentStatuses(session, notificationRecords);
            attendanceNotificationService.notifySessionFinalized(session);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                attendanceNotificationService.notifyFinalizedStudentStatuses(session, notificationRecords);
                attendanceNotificationService.notifySessionFinalized(session);
            }
        });
    }

    private <T> T inTransaction(Supplier<T> operation) {
        return transactionTemplate == null
                ? operation.get()
                : transactionTemplate.execute(status -> operation.get());
    }

}
