package ma.eniad.justificationservice.service;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.client.UserServiceClient;
import ma.eniad.justificationservice.dto.AttendanceJustificationContext;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.AttendanceSessionLookupResponse;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JustificationService {

    private static final Logger log = LoggerFactory.getLogger(JustificationService.class);
    private static final Set<String> REVIEWER_ROLES = Set.of("ADMIN", "TEACHER");
    private static final String JUSTIFICATION_SOURCE = "justification-service";

    private final JustificationRepository repository;
    private final AttendanceServiceClient attendanceServiceClient;
    private final UserServiceClient userServiceClient;
    private final JustificationNotificationService justificationNotificationService;

    @Transactional
    public List<JustificationResponse> findForAdmin(RequestUser user, JustificationStatus status) {
        user.requireRole("ADMIN");
        List<Justification> rows = repository.findAllByOrderBySubmittedAtDesc();
        hydrateMissingContext(rows);
        return filterByStatus(rows, status);
    }

    @Transactional
    public List<JustificationResponse> findForTeacher(RequestUser user, JustificationStatus status) {
        user.requireRole("TEACHER");
        hydrateLegacyTeacherScope();
        return filterByStatus(repository.findByTeacherIdOrderBySubmittedAtDesc(user.id()), status);
    }

    @Transactional(readOnly = true)
    public List<JustificationResponse> findForStudent(RequestUser user, JustificationStatus status) {
        user.requireRole("STUDENT");
        return filterByStatus(repository.findByStudentIdOrderBySubmittedAtDesc(user.id()), status);
    }

    @Transactional
    public List<JustificationResponse> findAll(JustificationStatus status, Long studentId) {
        List<Justification> rows = studentId != null
                ? repository.findByStudentIdOrderBySubmittedAtDesc(studentId)
                : repository.findAllByOrderBySubmittedAtDesc();
        hydrateMissingContext(rows);
        return filterByStatus(rows, status);
    }

    @Transactional
    public JustificationResponse findById(Long id, RequestUser user) {
        Justification justification = requireJustification(id);
        ensureContext(justification);
        requireCanView(justification, user);
        return toResponse(justification);
    }

    @Transactional
    public JustificationResponse findById(Long id) {
        Justification justification = requireJustification(id);
        ensureContext(justification);
        return toResponse(justification);
    }

    @Transactional(readOnly = true)
    public Justification findEntityById(Long id) {
        return requireJustification(id);
    }

    @Transactional
    public JustificationResponse submit(RequestUser user, SubmitJustificationRequest request) {
        user.requireRole("STUDENT");
        if (repository.existsBySessionIdAndStudentId(request.sessionId(), user.id())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A justification already exists for this absence");
        }

        AttendanceJustificationContext context = getAttendanceContext(request.sessionId(), user.id());
        if (!"ABSENT".equals(context.attendanceStatus())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only an absent attendance record can be justified");
        }

        Justification saved = saveSubmittedJustification(
                Justification.builder()
                        .sessionId(context.sessionId())
                        .attendanceRecordId(context.attendanceRecordId())
                        .studentId(context.studentId())
                        .groupId(context.groupId())
                        .teacherId(context.teacherId())
                        .teacherName(context.teacherFullName())
                        .studentName(context.studentName())
                        .studentEmail(context.studentEmail())
                        .studentCode(context.studentCode())
                        .module(context.courseLabel())
                        .roomLabel(context.roomLabel())
                        .sessionDate(context.sessionStartedAt())
                        .sessionEndedAt(context.sessionEndedAt())
                        .status(JustificationStatus.PENDING)
                        .reason(request.reason().trim())
                        .documentUrl(normalizeDocumentUrl(request.documentUrl()))
                        .submittedAt(LocalDateTime.now())
                        .build()
        );
        return toResponse(saved);
    }

    @Transactional
    public JustificationResponse submit(SubmitJustificationRequest request) {
        Long studentId = requirePresent(request.studentId(), "studentId is required");
        if (repository.existsBySessionIdAndStudentId(request.sessionId(), studentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A justification already exists for this absence");
        }

        Justification saved = saveSubmittedJustification(
                Justification.builder()
                        .sessionId(request.sessionId())
                        .studentId(studentId)
                        .studentName(requireNonBlank(request.studentName(), "studentName is required"))
                        .studentEmail(normalizeOptional(request.studentEmail()))
                        .studentCode(normalizeOptional(request.studentCode()))
                        .studentFormation(normalizeOptional(request.studentFormation()))
                        .studentClass(normalizeOptional(request.studentClass()))
                        .studentGroup(normalizeOptional(request.studentGroup()))
                        .module(requireNonBlank(request.module(), "module is required"))
                        .sessionDate(requirePresent(request.sessionDate(), "sessionDate is required"))
                        .status(JustificationStatus.PENDING)
                        .reason(request.reason().trim())
                        .submittedAt(LocalDateTime.now())
                        .documentUrl(normalizeDocumentUrl(request.documentUrl()))
                        .build()
        );
        return toResponse(saved);
    }

    @Transactional
    public List<JustificationResponse> markAllAsPending() {
        List<Justification> justifications = repository.findAll();
        justifications.forEach(justification -> {
            justification.setStatus(JustificationStatus.PENDING);
            justification.setTeacherComment(null);
            justification.setReviewedBy(null);
            justification.setReviewerRole(null);
            justification.setReviewedAt(null);
        });
        return repository.saveAll(justifications).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional
    public JustificationResponse decide(Long id, RequestUser user, DecisionJustificationRequest request) {
        if (request.status() == JustificationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Decision must be APPROVED or REJECTED");
        }

        Justification justification = requirePendingJustification(id);
        ensureContext(justification);
        requireCanDecide(justification, user);

        String decisionRole = user.primaryDecisionRole();
        justification.setStatus(request.status());
        justification.setTeacherComment(normalizeOptional(request.comment()));
        justification.setReviewedBy(String.valueOf(user.id()));
        justification.setReviewerRole(decisionRole);
        justification.setReviewedAt(LocalDateTime.now());
        Justification saved = repository.saveAndFlush(justification);

        if (request.status() == JustificationStatus.APPROVED) {
            justifyAttendanceRecord(saved, String.valueOf(user.id()), decisionRole);
            notifyAfterCommit(() -> justificationNotificationService.notifyApproved(saved));
        } else {
            notifyAfterCommit(() -> justificationNotificationService.notifyRejected(saved));
        }

        return toResponse(saved);
    }

    @Transactional
    public JustificationResponse approve(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());
        String reviewerLabel = buildReviewerLabel(request);

        ensureContext(justification);
        justifyAttendanceRecord(justification, reviewerLabel, reviewerRole);
        justification.setStatus(JustificationStatus.APPROVED);
        applyReviewData(justification, request, reviewerRole);

        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> justificationNotificationService.notifyApproved(saved));
        return toResponse(saved);
    }

    @Transactional
    public JustificationResponse decline(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());

        ensureContext(justification);
        justification.setStatus(JustificationStatus.REJECTED);
        applyReviewData(justification, request, reviewerRole);

        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> justificationNotificationService.notifyRejected(saved));
        return toResponse(saved);
    }

    private Justification saveSubmittedJustification(Justification justification) {
        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> {
            justificationNotificationService.notifySubmitted(saved);
            notifyResponsibleTeacher(saved);
            notifyAdmins(saved);
        });
        return saved;
    }

    private void notifyAfterCommit(Runnable notification) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            safeRun(notification);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                safeRun(notification);
            }
        });
    }

    private void safeRun(Runnable notification) {
        try {
            notification.run();
        } catch (RuntimeException ex) {
            log.warn("Failed to dispatch justification notification", ex);
        }
    }

    private void notifyResponsibleTeacher(Justification justification) {
        try {
            Long teacherId = justification.getTeacherId();
            if (teacherId == null && justification.getSessionId() != null) {
                AttendanceSessionLookupResponse session =
                        attendanceServiceClient.getSession(justification.getSessionId(), JUSTIFICATION_SOURCE);
                teacherId = session.teacherId();
            }

            if (teacherId == null) {
                log.warn("Skipping teacher notification because justificationId={} has no teacherId", justification.getId());
                return;
            }

            justificationNotificationService.notifySubmittedForTeacher(justification, teacherId);
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve responsible teacher for justificationId={}", justification.getId(), ex);
        }
    }

    private void notifyAdmins(Justification justification) {
        try {
            for (Long adminId : userServiceClient.getAdminIds(JUSTIFICATION_SOURCE)) {
                if (adminId != null) {
                    justificationNotificationService.notifySubmittedForAdmin(justification, adminId);
                }
            }
        } catch (RuntimeException ex) {
            log.warn("Failed to resolve admins for justificationId={}", justification.getId(), ex);
        }
    }

    private List<JustificationResponse> filterByStatus(List<Justification> rows, JustificationStatus status) {
        return rows.stream()
                .filter(row -> status == null || row.getStatus() == status)
                .map(this::toResponse)
                .toList();
    }

    private void hydrateLegacyTeacherScope() {
        repository.findByTeacherIdIsNullAndSessionIdIsNotNull().forEach(justification -> {
            try {
                ensureContext(justification);
            } catch (ResponseStatusException ignored) {
                // Legacy/demo rows may reference sessions that no longer exist.
            }
        });
    }

    private void hydrateMissingContext(List<Justification> rows) {
        rows.stream()
                .filter(this::shouldEnsureContext)
                .forEach(justification -> {
                    try {
                        ensureContext(justification);
                    } catch (ResponseStatusException ignored) {
                        // Legacy/demo rows may reference sessions that no longer exist.
                    }
                });
    }

    private boolean shouldEnsureContext(Justification justification) {
        if (justification.getSessionId() == null || justification.getStudentId() == null) {
            return false;
        }
        return justification.getTeacherId() == null
                || justification.getTeacherName() == null
                || justification.getAttendanceRecordId() == null
                || justification.getGroupId() == null
                || justification.getStudentEmail() == null
                || justification.getStudentCode() == null
                || justification.getModule() == null
                || justification.getSessionDate() == null;
    }

    private void ensureContext(Justification justification) {
        if (!shouldEnsureContext(justification)) {
            return;
        }

        AttendanceJustificationContext context = getAttendanceContext(
                justification.getSessionId(),
                justification.getStudentId()
        );
        applyContext(justification, context);
        repository.save(justification);
    }

    private void applyContext(Justification justification, AttendanceJustificationContext context) {
        justification.setAttendanceRecordId(context.attendanceRecordId());
        justification.setSessionId(context.sessionId());
        justification.setStudentId(context.studentId());
        justification.setGroupId(context.groupId());
        justification.setTeacherId(context.teacherId());
        justification.setTeacherName(context.teacherFullName());
        justification.setStudentName(context.studentName());
        justification.setStudentEmail(context.studentEmail());
        justification.setStudentCode(context.studentCode());
        justification.setModule(context.courseLabel());
        justification.setRoomLabel(context.roomLabel());
        justification.setSessionDate(context.sessionStartedAt());
        justification.setSessionEndedAt(context.sessionEndedAt());
    }

    private void requireCanView(Justification justification, RequestUser user) {
        if (user.hasRole("ADMIN")) {
            return;
        }
        if (user.hasRole("TEACHER") && user.id().equals(justification.getTeacherId())) {
            return;
        }
        if (user.hasRole("STUDENT") && user.id().equals(justification.getStudentId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Justification is outside the caller scope");
    }

    private void requireCanDecide(Justification justification, RequestUser user) {
        if (user.hasRole("ADMIN")) {
            return;
        }
        if (user.hasRole("TEACHER") && user.id().equals(justification.getTeacherId())) {
            return;
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Teacher does not own the related session");
    }

    private void applyReviewData(Justification justification,
                                 ReviewJustificationRequest request,
                                 String reviewerRole) {
        justification.setTeacherComment(normalizeOptional(request.comment()));
        justification.setReviewedBy(buildReviewerLabel(request));
        justification.setReviewerRole(reviewerRole);
        justification.setReviewedAt(LocalDateTime.now());
    }

    private String requireReviewerRole(String role) {
        String normalized = requireNonBlank(role, "reviewerRole is required").toUpperCase(Locale.ROOT);
        if (!REVIEWER_ROLES.contains(normalized)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only ADMIN or TEACHER can review justifications");
        }
        return normalized;
    }

    private String buildReviewerLabel(ReviewJustificationRequest request) {
        String reviewerName = requireNonBlank(request.reviewerName(), "reviewerName is required");
        String reviewerId = normalizeOptional(request.reviewerId());
        if (reviewerId == null) {
            return reviewerName;
        }
        return reviewerName + " (" + reviewerId + ")";
    }

    private void justifyAttendanceRecord(Justification justification, String decidedBy, String decisionRole) {
        try {
            attendanceServiceClient.justifyAbsence(
                    justification.getSessionId(),
                    justification.getStudentId(),
                    JUSTIFICATION_SOURCE,
                    new AttendanceJustificationRequest(
                            justification.getId(),
                            decidedBy,
                            decisionRole
                    )
            );
        } catch (FeignException ex) {
            HttpStatus status = HttpStatus.resolve(ex.status());
            throw new ResponseStatusException(
                    status != null ? status : HttpStatus.BAD_GATEWAY,
                    "Attendance record could not be justified",
                    ex
            );
        }
    }

    private AttendanceJustificationContext getAttendanceContext(Long sessionId, Long studentId) {
        try {
            return attendanceServiceClient.getJustificationContext(
                    sessionId,
                    studentId,
                    JUSTIFICATION_SOURCE
            );
        } catch (FeignException ex) {
            HttpStatus status = HttpStatus.resolve(ex.status());
            throw new ResponseStatusException(
                    status != null ? status : HttpStatus.BAD_GATEWAY,
                    "Attendance context is unavailable",
                    ex
            );
        }
    }

    private Justification requirePendingJustification(Long id) {
        Justification justification = repository.findByIdForDecision(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justification not found"));
        if (justification.getStatus() != JustificationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending justifications can be reviewed");
        }
        return justification;
    }

    private Justification requireJustification(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justification not found"));
    }

    private JustificationResponse toResponse(Justification justification) {
        String documentUrl = justification.getDocumentUrl();
        String documentName = extractFileName(documentUrl);
        String downloadUrl = documentUrl == null ? null : "/api/justifications/" + justification.getId() + "/download";

        return JustificationResponse.builder()
                .id(justification.getId())
                .attendanceRecordId(justification.getAttendanceRecordId())
                .sessionId(justification.getSessionId())
                .studentId(justification.getStudentId())
                .groupId(justification.getGroupId())
                .teacherId(justification.getTeacherId())
                .teacherName(justification.getTeacherName())
                .studentName(justification.getStudentName())
                .studentEmail(justification.getStudentEmail())
                .studentCode(justification.getStudentCode())
                .studentFormation(justification.getStudentFormation())
                .studentClass(justification.getStudentClass())
                .studentGroup(justification.getStudentGroup())
                .courseLabel(justification.getModule())
                .module(justification.getModule())
                .roomLabel(justification.getRoomLabel())
                .absenceStartedAt(justification.getSessionDate())
                .sessionDate(justification.getSessionDate())
                .absenceEndedAt(justification.getSessionEndedAt())
                .reason(justification.getReason())
                .attachmentUrl(documentUrl)
                .documentUrl(documentUrl)
                .documentName(documentName)
                .downloadUrl(downloadUrl)
                .status(justification.getStatus())
                .decisionComment(justification.getTeacherComment())
                .teacherComment(justification.getTeacherComment())
                .decidedBy(justification.getReviewedBy())
                .reviewedBy(justification.getReviewedBy())
                .decidedByRole(justification.getReviewerRole())
                .reviewerRole(justification.getReviewerRole())
                .decidedAt(justification.getReviewedAt())
                .reviewedAt(justification.getReviewedAt())
                .createdAt(justification.getSubmittedAt())
                .submittedAt(justification.getSubmittedAt())
                .updatedAt(justification.getUpdatedAt())
                .build();
    }

    private String normalizeDocumentUrl(String documentUrl) {
        String normalized = normalizeOptional(documentUrl);
        if (normalized == null) {
            return null;
        }

        try {
            URI uri = new URI(normalized);
            String path = uri.getPath();
            if (path == null || path.isBlank()) {
                return normalized;
            }

            if (path.startsWith("/")) {
                path = path.substring(1);
            }

            int index = path.indexOf("justifications/");
            if (index >= 0) {
                return normalizeOptional(path.substring(index));
            }

            return normalizeOptional(path);
        } catch (Exception ex) {
            return normalized;
        }
    }

    private String extractFileName(String documentUrl) {
        String normalized = normalizeOptional(documentUrl);
        if (normalized == null) {
            return null;
        }

        String path = normalized.split("\\?")[0];
        String fileName = path.substring(path.lastIndexOf('/') + 1);
        fileName = fileName.replaceFirst("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]", "");
        return fileName.replaceFirst("[_-][0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\\.[a-zA-Z0-9]+$|$)", "");
    }

    private <T> T requirePresent(T value, String message) {
        if (value == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return value;
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
}
