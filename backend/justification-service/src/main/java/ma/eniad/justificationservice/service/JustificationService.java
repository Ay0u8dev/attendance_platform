package ma.eniad.justificationservice.service;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.Set;

import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import feign.FeignException;
import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.client.AttendanceServiceClient;
import ma.eniad.justificationservice.client.UserServiceClient;
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.AttendanceSessionLookupResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;

@Service
@RequiredArgsConstructor
public class JustificationService {

    private static final Set<String> REVIEWER_ROLES = Set.of("ADMIN", "TEACHER");
    private static final String JUSTIFICATION_SOURCE = "justification-service";

    private final JustificationRepository repository;
    private final AttendanceServiceClient attendanceServiceClient;
    private final UserServiceClient userServiceClient;
    private final JustificationNotificationService justificationNotificationService;

    @Transactional
    public Justification submit(SubmitJustificationRequest request) {
        if (repository.existsBySessionIdAndStudentId(request.sessionId(), request.studentId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "A justification already exists for this absence");
        }

        // L'etudiant depose une demande en attente; la decision appartient ensuite au prof ou a l'admin.
        Justification justification = Justification.builder()
                .sessionId(request.sessionId())
                .studentId(request.studentId())
                .studentName(request.studentName().trim())
                .studentEmail(normalizeOptional(request.studentEmail()))
                .studentCode(normalizeOptional(request.studentCode()))
                .studentFormation(normalizeOptional(request.studentFormation()))
                .studentClass(normalizeOptional(request.studentClass()))
                .studentGroup(normalizeOptional(request.studentGroup()))
                .module(request.module().trim())
                .sessionDate(request.sessionDate())
                .status(JustificationStatus.PENDING)
                .reason(request.reason().trim())
                .submittedAt(LocalDateTime.now())
                .documentUrl(normalizeDocumentUrl(request.documentUrl()))
                .build();

        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> {
            justificationNotificationService.notifySubmitted(saved);
            notifyResponsibleTeacher(saved);
            notifyAdmins(saved);
        });
        return saved;
    }

    @Transactional(readOnly = true)
    public List<Justification> findAll(JustificationStatus status, Long studentId) {
        if (studentId != null) {
            return repository.findByStudentIdOrderBySubmittedAtDesc(studentId);
        }
        if (status != null) {
            return repository.findByStatusOrderBySubmittedAtAsc(status);
        }
        return repository.findAll();
    }

    @Transactional(readOnly = true)
    public Justification findById(Long id) {
        return requireJustification(id);
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
    public Justification approve(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());

        try {
            attendanceServiceClient.justifyAbsence(
                    justification.getSessionId(),
                    justification.getStudentId(),
                    JUSTIFICATION_SOURCE,
                    new AttendanceJustificationRequest(justification.getId(), buildReviewerLabel(request))
            );
        } catch (FeignException ex) {
            HttpStatus status = HttpStatus.resolve(ex.status());
            throw new ResponseStatusException(
                    status != null ? status : HttpStatus.BAD_GATEWAY,
                    ex.getMessage(),
                    ex
            );
        }

        justification.setStatus(JustificationStatus.APPROVED);
        applyReviewData(justification, request, reviewerRole);
        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> justificationNotificationService.notifyApproved(saved));
        return saved;
    }

    @Transactional
    public Justification decline(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());

        // Le refus ne modifie pas l'assiduite: l'absence reste ABSENT.
        justification.setStatus(JustificationStatus.REJECTED);
        applyReviewData(justification, request, reviewerRole);
        Justification saved = repository.save(justification);
        notifyAfterCommit(() -> justificationNotificationService.notifyRejected(saved));
        return saved;
    }

    private static final Logger log = LoggerFactory.getLogger(JustificationService.class);

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
        } catch (Exception ex) {
            log.warn("Failed to dispatch justification notification", ex);
        }
    }

    private void notifyResponsibleTeacher(Justification justification) {
        if (attendanceServiceClient == null || justificationNotificationService == null) {
            return;
        }

        try {
            AttendanceSessionLookupResponse session =
                    attendanceServiceClient.getSession(justification.getSessionId(), JUSTIFICATION_SOURCE);

            if (session.teacherId() == null) {
                log.warn(
                        "Skipping teacher justification notification because session={} has no teacherId",
                        justification.getSessionId()
                );
                return;
            }

            justificationNotificationService.notifySubmittedForTeacher(justification, session.teacherId());
        } catch (RuntimeException ex) {
            log.warn(
                    "Failed to resolve responsible teacher for justificationId={} sessionId={}: {}",
                    justification.getId(),
                    justification.getSessionId(),
                    ex.getMessage(),
                    ex
            );
        }
    }

    private void notifyAdmins(Justification justification) {
        if (userServiceClient == null || justificationNotificationService == null) {
            return;
        }

        try {
            List<Long> adminIds = userServiceClient.getAdminIds(JUSTIFICATION_SOURCE);
            for (Long adminId : adminIds) {
                if (adminId != null) {
                    justificationNotificationService.notifySubmittedForAdmin(justification, adminId);
                }
            }
        } catch (RuntimeException ex) {
            log.warn(
                    "Failed to resolve admins for justificationId={}: {}",
                    justification.getId(),
                    ex.getMessage(),
                    ex
            );
        }
    }

    private Justification requirePendingJustification(Long id) {
        Justification justification = requireJustification(id);
        if (justification.getStatus() != JustificationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Only pending justifications can be reviewed");
        }
        return justification;
    }

    private Justification requireJustification(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justification not found"));
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
        String normalized = role.trim().toUpperCase(Locale.ROOT);
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

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
