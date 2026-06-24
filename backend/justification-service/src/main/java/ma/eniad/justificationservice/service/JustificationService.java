package ma.eniad.justificationservice.service;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.dto.AttendanceJustificationContext;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class JustificationService {

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

    @Transactional
    public JustificationResponse findById(Long id, RequestUser user) {
        Justification justification = requireJustification(id);
        if (!user.hasRole("ADMIN") && justification.getTeacherId() == null) {
            ensureContext(justification);
        }
        requireCanView(justification, user);
        return toResponse(justification);
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
                .studentName(context.studentName())
                .studentEmail(context.studentEmail())
                .studentCode(context.studentCode())
                .module(context.courseLabel())
                .roomLabel(context.roomLabel())
                .sessionDate(context.sessionStartedAt())
                .sessionEndedAt(context.sessionEndedAt())
                .status(JustificationStatus.PENDING)
                .reason(request.reason().trim())
                .documentUrl(normalizeOptional(request.documentUrl()))
                .submittedAt(LocalDateTime.now())
                .build();

        return toResponse(repository.save(justification));
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
            justifyAttendanceRecord(saved, user, decisionRole);
        }

        return toResponse(saved);
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

    private void justifyAttendanceRecord(Justification justification, RequestUser user, String decisionRole) {
        try {
            attendanceServiceClient.justifyAbsence(
                    justification.getSessionId(),
                    justification.getStudentId(),
                    JUSTIFICATION_SOURCE,
                    new AttendanceJustificationRequest(
                            justification.getId(),
                            String.valueOf(user.id()),
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

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
