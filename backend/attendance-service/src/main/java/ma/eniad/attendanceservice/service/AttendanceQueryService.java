package ma.eniad.attendanceservice.service;

import jakarta.persistence.criteria.JoinType;
import lombok.AllArgsConstructor;
import ma.eniad.attendanceservice.client.UserServiceClient;
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
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@AllArgsConstructor
public class AttendanceQueryService {

    private final AttendanceSessionRepository attendanceSessionRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceSessionReadService attendanceSessionReadService;
    private final LiveAttendanceSessionStore liveAttendanceSessionStore;
    private final UserServiceClient userServiceClient;

    public PagedResponse<AttendanceSessionSummaryResponse> getTeacherSessions(Long teacherId,
                                                                              AttendanceSessionStatus status,
                                                                              LocalDate dateFrom,
                                                                              LocalDate dateTo,
                                                                              Pageable pageable) {
        Specification<AttendanceSession> spec = baseSessionSpec(status, dateFrom, dateTo)
                .and((root, query, cb) -> cb.equal(root.get("teacherId"), teacherId));
        return mapSessionPage(attendanceSessionRepository.findAll(spec, pageable));
    }

    public TeacherAttendanceReportResponse getTeacherExportReport(Long teacherId,
                                                                  LocalDate dateFrom,
                                                                  LocalDate dateTo,
                                                                  String courseLabel) {
        Specification<AttendanceSession> spec = baseSessionSpec(AttendanceSessionStatus.FINALIZED, dateFrom, dateTo)
                .and((root, query, cb) -> cb.equal(root.get("teacherId"), teacherId));
        if (courseLabel != null && !courseLabel.isBlank()) {
            spec = spec.and((root, query, cb) -> cb.equal(root.get("courseLabel"), courseLabel.trim()));
        }

        List<AttendanceSession> sessions = attendanceSessionRepository.findAll(spec).stream()
                .sorted(Comparator.comparing(AttendanceSession::getStartedAt)
                        .thenComparing(AttendanceSession::getId))
                .toList();
        if (sessions.isEmpty()) {
            return new TeacherAttendanceReportResponse(LocalDate.now(), List.of());
        }

        Map<Long, AttendanceSession> sessionsById = sessions.stream()
                .collect(Collectors.toMap(AttendanceSession::getId, Function.identity()));
        List<Long> sessionIds = sessions.stream().map(AttendanceSession::getId).toList();
        List<AttendanceRecord> records = attendanceRecordRepository.findBySessionIdInOrderByStudentIdAscSessionIdAsc(sessionIds);
        Map<Long, StudentRosterDto> currentRosterByStudentId = loadCurrentRosterByStudentId(sessions);

        Map<String, Map<Long, ReportStudentAccumulator>> groupedStudents = new LinkedHashMap<>();
        Map<String, Map<Long, TeacherAttendanceReportSessionResponse>> groupedSessions = new LinkedHashMap<>();

        for (AttendanceRecord record : records) {
            StudentRosterDto roster = currentRosterByStudentId.get(record.getStudentId());
            String filiere = firstNonBlank(record.getFiliere(), roster != null ? roster.filiere() : null, "Sans filiere");
            String groupeName = firstNonBlank(record.getGroupeName(), roster != null ? roster.groupeName() : null, String.valueOf(record.getGroupId()));

            groupedSessions
                    .computeIfAbsent(filiere, ignored -> new LinkedHashMap<>())
                    .putIfAbsent(record.getSessionId(), toReportSession(sessionsById.get(record.getSessionId())));

            groupedStudents
                    .computeIfAbsent(filiere, ignored -> new LinkedHashMap<>())
                    .computeIfAbsent(record.getStudentId(), ignored -> new ReportStudentAccumulator(record, groupeName))
                    .statusesBySessionId()
                    .put(record.getSessionId(), record.getStatus());
        }

        List<TeacherAttendanceReportFiliereResponse> filieres = groupedStudents.entrySet().stream()
                .map(entry -> new TeacherAttendanceReportFiliereResponse(
                        entry.getKey(),
                        groupedSessions.getOrDefault(entry.getKey(), Map.of()).values().stream()
                                .sorted(Comparator.comparing(TeacherAttendanceReportSessionResponse::startedAt)
                                        .thenComparing(TeacherAttendanceReportSessionResponse::sessionId))
                                .toList(),
                        entry.getValue().values().stream()
                                .sorted(Comparator.comparing(ReportStudentAccumulator::lastName, String.CASE_INSENSITIVE_ORDER)
                                        .thenComparing(ReportStudentAccumulator::firstName, String.CASE_INSENSITIVE_ORDER)
                                        .thenComparing(ReportStudentAccumulator::numApogee, String.CASE_INSENSITIVE_ORDER))
                                .map(ReportStudentAccumulator::toResponse)
                                .toList()
                ))
                .toList();

        return new TeacherAttendanceReportResponse(LocalDate.now(), filieres);
    }

    public AttendanceSessionDetailsResponse getActiveTeacherSession(Long teacherId) {
        AttendanceSession session = attendanceSessionRepository.findByTeacherIdAndStatus(teacherId, AttendanceSessionStatus.ACTIVE)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active session found"));
        return attendanceSessionReadService.getSession(session.getId(), teacherId);
    }

    public PagedResponse<AttendanceSessionSummaryResponse> getAdminSessions(Long teacherId,
                                                                            Long groupId,
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

        return new AdminOverviewResponse(
                totalSessions,
                activeSessions,
                finalizedSessions,
                totalPresent,
                totalAbsent,
                attendanceRate
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
                session.getTeacherFullName(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                List.copyOf(session.getGroupIds()),
                session.getStatus(),
                session.getStartedAt(),
                session.getEndsAt(),
                session.getEndedAt(),
                record.getStudentId(),
                record.getGroupId(),
                record.getFirstName(),
                record.getLastName(),
                record.getEmail(),
                record.getPfpUrl(),
                record.getNumApogee(),
                record.getStatus(),
                record.getMarkMethod(),
                record.getMarkedAt()
        );
    }

    public StudentActiveAttendanceSessionResponse getActiveStudentSession(Long studentId) {
        return attendanceSessionRepository.findAllByStatus(AttendanceSessionStatus.ACTIVE).stream()
                .map(session -> liveAttendanceSessionStore.findStudentState(session.getId(), studentId)
                        .map(student -> new StudentActiveAttendanceSessionResponse(
                                session.getId(),
                                session.getTeacherFullName(),
                                session.getCourseLabel(),
                                session.getRoomLabel(),
                                List.copyOf(session.getGroupIds()),
                                session.getStartedAt(),
                                session.getEndsAt(),
                                student.status()
                        )))
                .flatMap(Optional::stream)
                .findFirst()
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "No active attendance session found"));
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
                            session.getTeacherFullName(),
                            session.getCourseLabel(),
                            session.getRoomLabel(),
                            List.copyOf(session.getGroupIds()),
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
                session.getTeacherFullName(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                List.copyOf(session.getGroupIds()),
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

    private Map<Long, StudentRosterDto> loadCurrentRosterByStudentId(List<AttendanceSession> sessions) {
        List<Long> groupIds = sessions.stream()
                .flatMap(session -> session.getGroupIds().stream())
                .distinct()
                .toList();
        if (groupIds.isEmpty()) {
            return Map.of();
        }

        try {
            return userServiceClient.getStudentRosterByGroupIds(groupIds).stream()
                    .collect(Collectors.toMap(StudentRosterDto::studentId, Function.identity(), (existing, replacement) -> existing));
        } catch (RuntimeException ex) {
            return Map.of();
        }
    }

    private TeacherAttendanceReportSessionResponse toReportSession(AttendanceSession session) {
        return new TeacherAttendanceReportSessionResponse(
                session.getId(),
                session.getCourseLabel(),
                session.getRoomLabel(),
                session.getStartedAt(),
                session.getEndedAt()
        );
    }

    private String firstNonBlank(String first, String second, String fallback) {
        if (first != null && !first.isBlank()) {
            return first.trim();
        }
        if (second != null && !second.isBlank()) {
            return second.trim();
        }
        return fallback;
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
            case "sessionStatus" -> "session.status";
            case "attendanceStatus" -> "status";
            case "markMethod" -> "markMethod";
            case "markedAt" -> "markedAt";
            default -> "session.startedAt";
        };
    }

    private record ReportStudentAccumulator(
            Long studentId,
            String numApogee,
            String firstName,
            String lastName,
            String email,
            Long groupId,
            String groupeName,
            Map<Long, AttendanceStudentStatus> statusesBySessionId
    ) {
        ReportStudentAccumulator(AttendanceRecord record, String groupeName) {
            this(
                    record.getStudentId(),
                    record.getNumApogee(),
                    record.getFirstName(),
                    record.getLastName(),
                    record.getEmail(),
                    record.getGroupId(),
                    groupeName,
                    new HashMap<>()
            );
        }

        TeacherAttendanceReportStudentResponse toResponse() {
            return new TeacherAttendanceReportStudentResponse(
                    studentId,
                    numApogee,
                    firstName,
                    lastName,
                    email,
                    groupId,
                    groupeName,
                    statusesBySessionId
            );
        }
    }
}
