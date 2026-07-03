package ma.eniad.justificationservice.service;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.dto.AttendanceJustificationContext;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JustificationService {

    private static final Set<String> REVIEWER_ROLES = Set.of("ADMIN", "TEACHER");
    private static final String JUSTIFICATION_SOURCE = "justification-service";

    private final JustificationRepository repository;
    private final AttendanceServiceClient attendanceServiceClient;

    @Transactional(readOnly = true)
    public List<JustificationResponse> findForAdmin(RequestUser user, JustificationStatus status) {
        user.requireRole("ADMIN");
        return filterByStatus(repository.findAllByOrderBySubmittedAtDesc(), status);
    }

    @Transactional
    public List<JustificationResponse> findForTeacher(RequestUser user, JustificationStatus status) {
        user.requireRole("TEACHER");
        hydrateLegacyTeacherContext();
        return filterByStatus(repository.findByTeacherIdOrderBySubmittedAtDesc(user.id()), status);
    }

    @Transactional(readOnly = true)
    public List<JustificationResponse> findForStudent(RequestUser user, JustificationStatus status) {
        user.requireRole("STUDENT");
        return filterByStatus(repository.findByStudentIdOrderBySubmittedAtDesc(user.id()), status);
    }

    @Transactional(readOnly = true)
    public List<Justification> findAll(JustificationStatus status, Long studentId) {
        List<Justification> rows = studentId != null
                ? repository.findByStudentIdOrderBySubmittedAtDesc(studentId)
                : repository.findAllByOrderBySubmittedAtDesc();
        if (status == null) {
            return rows;
        }
        return rows.stream()
                .filter(row -> row.getStatus() == status)
                .toList();
    }

    @Transactional
    public JustificationResponse findById(Long id, RequestUser user) {
        Justification justification = requireJustification(id);
        if (!user.hasRole("ADMIN") && justification.getTeacherId() == null) {
            ensureContext(justification);
        }
        requireCanView(justification, user);
        return toResponse(justification);
    }

    @Transactional(readOnly = true)
    public Justification findById(Long id) {
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

        Justification justification = Justification.builder()
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
                .build();

        return toResponse(repository.save(justification));
    }

    @Transactional
    public Justification submit(SubmitJustificationRequest request) {
        Long studentId = requirePresent(request.studentId(), "studentId is required");
        if (repository.existsBySessionIdAndStudentId(request.sessionId(), studentId)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A justification already exists for this absence");
        }

        Justification justification = Justification.builder()
                .sessionId(request.sessionId())
                .studentId(studentId)
                .studentName(requireNonBlank(request.studentName(), "studentName is required"))
                .studentCode(normalizeOptional(request.studentCode()))
                .module(requireNonBlank(request.module(), "module is required"))
                .sessionDate(requirePresent(request.sessionDate(), "sessionDate is required"))
                .status(JustificationStatus.PENDING)
                .reason(request.reason().trim())
                .submittedAt(LocalDateTime.now())
                .documentUrl(normalizeDocumentUrl(request.documentUrl()))
                .build();

        return repository.save(justification);
    }

    @Transactional
    public List<Justification> markAllAsPending() {
        List<Justification> justifications = repository.findAll();
        justifications.forEach(justification -> {
            justification.setStatus(JustificationStatus.PENDING);
            justification.setTeacherComment(null);
            justification.setReviewedBy(null);
            justification.setReviewerRole(null);
            justification.setReviewedAt(null);
        });
        return repository.saveAll(justifications);
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
        }

        return toResponse(saved);
    }

    @Transactional
    public Justification approve(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());
        String reviewerLabel = buildReviewerLabel(request);

        justifyAttendanceRecord(justification, reviewerLabel, reviewerRole);

        justification.setStatus(JustificationStatus.APPROVED);
        applyReviewData(justification, request, reviewerRole);
        return repository.save(justification);
    }

    @Transactional
    public Justification decline(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());

        justification.setStatus(JustificationStatus.REJECTED);
        applyReviewData(justification, request, reviewerRole);
        return repository.save(justification);
    }

    private List<JustificationResponse> filterByStatus(List<Justification> rows, JustificationStatus status) {
        return rows.stream()
                .filter(row -> status == null || row.getStatus() == status)
                .map(this::toResponse)
                .toList();
    }

    private void hydrateLegacyTeacherContext() {
        repository.findByTeacherIdIsNullAndSessionIdIsNotNull().forEach(justification -> {
            try {
                ensureContext(justification);
            } catch (ResponseStatusException ignored) {
                // Legacy/demo rows may reference sessions that no longer exist.
            }
        });
    }

    private void ensureContext(Justification justification) {
        if (justification.getTeacherId() != null
                && justification.getAttendanceRecordId() != null
                && justification.getGroupId() != null) {
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
        String reviewerId = normalizeOptional(request.reviewerId());
        if (reviewerId == null) {
            return request.reviewerName().trim();
        }
        return request.reviewerName().trim() + " (" + reviewerId + ")";
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
        return new JustificationResponse(
                justification.getId(),
                justification.getAttendanceRecordId(),
                justification.getSessionId(),
                justification.getStudentId(),
                justification.getGroupId(),
                justification.getTeacherId(),
                justification.getTeacherName(),
                justification.getStudentName(),
                justification.getStudentEmail(),
                justification.getStudentCode(),
                justification.getModule(),
                justification.getRoomLabel(),
                justification.getSessionDate(),
                justification.getSessionEndedAt(),
                justification.getReason(),
                justification.getDocumentUrl(),
                justification.getStatus(),
                justification.getTeacherComment(),
                justification.getReviewedBy(),
                justification.getReviewerRole(),
                justification.getReviewedAt(),
                justification.getSubmittedAt(),
                justification.getUpdatedAt()
        );
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
