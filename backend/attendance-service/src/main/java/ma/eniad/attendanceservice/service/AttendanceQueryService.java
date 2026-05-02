package ma.eniad.attendanceservice.service;

import jakarta.persistence.criteria.JoinType;
import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.dto.*;
import ma.eniad.attendanceservice.entity.*;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.data.jpa.domain.Specification;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class AttendanceQueryService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceSessionReadService attendanceSessionReadService;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;

    public PagedResponse<AttendanceSessionSummaryResponse> getTeacherSessions(Long teacherId,
                                                                              AttendanceSessionStatus status,
                                                                              LocalDate dateFrom,
                                                                              LocalDate dateTo,
                                                                              Pageable pageable) {
        Specification<AttendanceSession> spec = baseSessionSpec(status, dateFrom, dateTo)
                .and((root, query, cb) -> cb.equal(root.get("teacherId"), teacherId));
        return mapSessionPage(attendanceSessionRepository.findAll(spec, pageable));
    }

    public AttendanceSessionDetailsResponse getActiveTeacherSession(Long teacherId) {
        AttendanceSession session = attendanceSessionRepository.findByTeacherIdAndStatus(teacherId, AttendanceSessionStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active session found"));
        return attendanceSessionReadService.getSession(session.getId(), teacherId);
    }

    public PagedResponse<AttendanceSessionSummaryResponse> getAdminSessions(Long teacherId,
                                                                            Long groupId,
                                                                            AttendanceSessionMethod method,
                                                                            AttendanceSessionStatus status,
                                                                            LocalDate dateFrom,
                                                                            LocalDate dateTo,
                                                                            Pageable pageable) {
        Specification<AttendanceSession> spec = baseSessionSpec(status, dateFrom, dateTo);

        if (teacherId != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("teacherId"), teacherId));
        }
        if (groupId != null) {
            spec = spec.and((root, query, cb) -> {
                query.distinct(true);
                return cb.equal(root.join("groupIds", JoinType.LEFT), groupId);
            });
        }
        if (method != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("method"), method));
        }
        return mapSessionPage(attendanceSessionRepository.findAll(spec, pageable));
    }

    public AttendanceSessionDetailsResponse getAdminSession(Long sessionId) {
        return attendanceSessionReadService.getSessionForAdmin(sessionId);
    }

    public AdminOverviewResponse getAdminOverview(LocalDate dateFrom, LocalDate dateTo) {
        Specification<AttendanceSession> spec = baseSessionSpec(null, dateFrom, dateTo);
        List<AttendanceSession> sessions = attendanceSessionRepository.findAll(spec);

        long totalSessions = sessions.size();
        long activeSessions = sessions.stream().filter(session -> session.getStatus() == AttendanceSessionStatus.ACTIVE).count();
        long finalizedSessions = sessions.stream().filter(session -> session.getStatus() == AttendanceSessionStatus.FINALIZED).count();

        long totalPresent = 0;
        long totalAbsent = 0;
        for (AttendanceSession session : sessions) {
            AttendanceCounts counts = resolveCounts(session);
            totalPresent += counts.presentCount();
            totalAbsent += counts.absentCount();
        }

        long totalResolved = totalPresent + totalAbsent;
        double attendanceRate = totalResolved == 0 ? 0.0 : (double) totalPresent / totalResolved;

        long qrCodeSessions = sessions.stream().filter(session -> session.getMethod() == AttendanceSessionMethod.QR_CODE).count();
        long faceIdSessions = sessions.stream().filter(session -> session.getMethod() == AttendanceSessionMethod.FACE_ID).count();
        long manualSessions = sessions.stream().filter(session -> session.getMethod() == AttendanceSessionMethod.MANUAL).count();

        return new AdminOverviewResponse(
                totalSessions,
                activeSessions,
                finalizedSessions,
                totalPresent,
                totalAbsent,
                attendanceRate,
                new MethodBreakdownResponse(qrCodeSessions, faceIdSessions, manualSessions)
        );
    }

    public PagedResponse<StudentAttendanceSessionSummaryResponse> getStudentSessions(Long studentId,
                                                                                     AttendanceStudentStatus status,
                                                                                     LocalDate dateFrom,
                                                                                     LocalDate dateTo,
                                                                                     Pageable pageable) {
        Pageable normalizedPageable = normalizeStudentSessionPageable(pageable);
        Page<AttendanceRecord> records = attendanceRecordRepository.findStudentHistory(
                studentId,
                status != null, status,
                dateFrom != null, atStartOfDay(dateFrom),
                dateTo != null, startOfNextDay(dateTo),
                normalizedPageable
        );
        Map<Long, AttendanceSession> sessionsById = loadSessions(records.getContent().stream()
                .map(AttendanceRecord::getSessionId)
                .distinct()
                .toList());

        List<StudentAttendanceSessionSummaryResponse> items = records.getContent().stream()
                .map(record -> toStudentSummary(record, sessionsById.get(record.getSessionId())))
                .toList();
        return new PagedResponse<>(items, records.getNumber(), records.getSize(), records.getTotalElements(), records.getTotalPages());
    }

    public StudentAttendanceSessionDetailResponse getStudentSession(Long studentId, Long sessionId) {
        AttendanceRecord record = attendanceRecordRepository.findBySessionIdAndStudentId(sessionId, studentId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found"));
        AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Session not found"));
        if (session.getStatus() != AttendanceSessionStatus.FINALIZED) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Attendance record not found");
        }

        return new StudentAttendanceSessionDetailResponse(
                session.getId(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                List.copyOf(session.getGroupIds()),
                session.getMethod(),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndsAt(),
                session.getEndedAt(),
                record.getStudentId(),
                record.getGroupId(),
                record.getFirstName(),
                record.getLastName(),
                record.getEmail(),
                record.getNumApogee(),
                record.getStatus(),
                record.getMarkMethod(),
                record.getDeviceId(),
                record.getMarkedGpsLat(),
                record.getMarkedGpsLon(),
                record.getMarkedAt()
        );
    }

    public StudentAttendanceOverviewResponse getStudentOverview(Long studentId) {
        List<AttendanceRecord> records = attendanceRecordRepository.findStudentHistory(
                studentId,
                false, null,
                false, null,
                false, null,
                Pageable.unpaged()
        ).getContent();
        long presents = records.stream().filter(record -> record.getStatus() == AttendanceStudentStatus.PRESENT).count();
        long absences = records.stream().filter(record -> record.getStatus() == AttendanceStudentStatus.ABSENT).count();
        long totalSessions = records.size();
        double attendanceRate = totalSessions == 0 ? 0.0 : (double) presents / totalSessions;
        return new StudentAttendanceOverviewResponse(totalSessions, presents, absences, attendanceRate);
    }

    private PagedResponse<AttendanceSessionSummaryResponse> mapSessionPage(Page<AttendanceSession> sessionsPage) {
        List<AttendanceSessionSummaryResponse> items = sessionsPage.getContent().stream()
                .map(session -> {
                    AttendanceCounts counts = resolveCounts(session);
                    return new AttendanceSessionSummaryResponse(
                            session.getId(),
                            session.getCourseLabel(),
                            session.getRoomLabel(),
                            List.copyOf(session.getGroupIds()),
                            session.getMethod(),
                            session.getStatus(),
                            session.getStartedAt(),
                            session.getEndsAt(),
                            session.getEndedAt(),
                            counts.presentCount(),
                            counts.absentCount(),
                            counts.unknownCount()
                    );
                })
                .toList();
        return new PagedResponse<>(items, sessionsPage.getNumber(), sessionsPage.getSize(), sessionsPage.getTotalElements(), sessionsPage.getTotalPages());
    }

    private AttendanceCounts resolveCounts(AttendanceSession session) {
        if (session.getStatus() == AttendanceSessionStatus.ACTIVE) {
            return liveAttendanceSessionStore.findSessionMeta(session.getId()).isPresent()
                    ? liveAttendanceSessionStore.getAttendanceCounts(session.getId())
                    : new AttendanceCounts(session.getPresentCount(), session.getAbsentCount(), session.getUnknownCount());
        }
        return new AttendanceCounts(session.getPresentCount(), session.getAbsentCount(), session.getUnknownCount());
    }

    private StudentAttendanceSessionSummaryResponse toStudentSummary(AttendanceRecord record, AttendanceSession session) {
        return new StudentAttendanceSessionSummaryResponse(
                session.getId(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                List.copyOf(session.getGroupIds()),
                session.getMethod(),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndedAt(),
                record.getStatus(),
                record.getMarkMethod(),
                record.getMarkedAt()
        );
    }

    private Map<Long, AttendanceSession> loadSessions(List<Long> sessionIds) {
        return attendanceSessionRepository.findAllById(sessionIds).stream()
                .collect(Collectors.toMap(AttendanceSession::getId, Function.identity()));
    }

    private Specification<AttendanceSession> baseSessionSpec(AttendanceSessionStatus status, LocalDate dateFrom, LocalDate dateTo) {
        Specification<AttendanceSession> spec = (root, query, cb) -> cb.conjunction();
        if (status != null) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("status"), status));
        }
        if (dateFrom != null) {
            spec = spec.and((root, query, cb) -> cb.greaterThanOrEqualTo(root.get("startedAt"), atStartOfDay(dateFrom)));
        }
        if (dateTo != null) {
            spec = spec.and((root, query, cb) -> cb.lessThan(root.get("startedAt"), startOfNextDay(dateTo)));
        }
        return spec;
    }

    private LocalDateTime atStartOfDay(LocalDate date) {
        return date == null ? null : date.atStartOfDay();
    }

    private LocalDateTime startOfNextDay(LocalDate date) {
        return date == null ? null : date.plusDays(1).atStartOfDay();
    }

    private Pageable normalizeStudentSessionPageable(Pageable pageable) {
        if (pageable == null || pageable.isUnpaged()) {
            return pageable;
        }

        Sort normalizedSort = pageable.getSort().isSorted()
                ? Sort.by(pageable.getSort().stream()
                .map(this::mapStudentSessionSortOrder)
                .toList())
                : Sort.by(Sort.Order.desc("session.startedAt"));

        return org.springframework.data.domain.PageRequest.of(pageable.getPageNumber(), pageable.getPageSize(), normalizedSort);
    }

    private Sort.Order mapStudentSessionSortOrder(Sort.Order order) {
        return new Sort.Order(order.getDirection(), mapStudentSessionSortProperty(order.getProperty()));
    }

    private String mapStudentSessionSortProperty(String property) {
        return switch (property) {
            case "startedAt" -> "session.startedAt";
            case "endedAt" -> "session.endedAt";
            case "courseLabel" -> "session.courseLabel";
            case "roomLabel" -> "session.roomLabel";
            case "sessionMethod" -> "session.method";
            case "sessionStatus" -> "session.status";
            case "attendanceStatus" -> "status";
            case "markMethod" -> "markMethod";
            case "markedAt" -> "markedAt";
            default -> "session.startedAt";
        };
    }
}
