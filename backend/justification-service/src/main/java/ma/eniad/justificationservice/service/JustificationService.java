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
import ma.eniad.justificationservice.dto.AttendanceJustificationRequest;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
import ma.eniad.justificationservice.repository.JustificationRepository;
@Service
@RequiredArgsConstructor
public class JustificationService {

    private static final Set<String> REVIEWER_ROLES = Set.of("ADMIN", "TEACHER");
    private static final String JUSTIFICATION_SOURCE = "justification-service";

    private final JustificationRepository repository;
    private final AttendanceServiceClient attendanceServiceClient;

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
                .studentCode(normalizeOptional(request.studentCode()))
                .module(request.module().trim())
                .sessionDate(request.sessionDate())
                .status(JustificationStatus.PENDING)
                .reason(request.reason().trim())
                .submittedAt(LocalDateTime.now())
                .documentUrl(normalizeDocumentUrl(request.documentUrl()))
                .build();

        return repository.save(justification);
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
        return repository.save(justification);
    }

    @Transactional
    public Justification decline(Long id, ReviewJustificationRequest request) {
        Justification justification = requirePendingJustification(id);
        String reviewerRole = requireReviewerRole(request.reviewerRole());

        // Le refus ne modifie pas l'assiduite: l'absence reste ABSENT.
        justification.setStatus(JustificationStatus.REJECTED);
        applyReviewData(justification, request, reviewerRole);
        return repository.save(justification);
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
