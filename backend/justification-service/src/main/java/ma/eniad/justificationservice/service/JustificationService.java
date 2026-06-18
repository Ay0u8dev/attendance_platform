package ma.eniad.justificationservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
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
import java.util.Locale;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class JustificationService {

    private static final Set<String> REVIEWER_ROLES = Set.of("ADMIN", "TEACHER");

    private final JustificationRepository repository;
    private final AttendanceRecordJustifier attendanceRecordJustifier;

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
                .documentUrl(normalizeOptional(request.documentUrl()))
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

        // Meme transaction: absence ABSENT -> JUSTIFIED, puis justification PENDING -> APPROVED.
        Long resolvedSessionId = attendanceRecordJustifier.justifyAbsence(justification);
        justification.setSessionId(resolvedSessionId);

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

    private String normalizeOptional(String value) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        return normalized.isEmpty() ? null : normalized;
    }
}
