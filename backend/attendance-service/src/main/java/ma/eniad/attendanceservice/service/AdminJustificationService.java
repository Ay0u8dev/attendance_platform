package ma.eniad.attendanceservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.dto.AdminJustificationResponse;
import ma.eniad.attendanceservice.dto.AdminJustificationReviewRequest;
import ma.eniad.attendanceservice.entity.AttendanceJustification;
import ma.eniad.attendanceservice.entity.AttendanceRecord;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;
import ma.eniad.attendanceservice.entity.JustificationStatus;
import ma.eniad.attendanceservice.repository.AttendanceJustificationRepository;
import ma.eniad.attendanceservice.repository.AttendanceRecordRepository;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.concurrent.atomic.AtomicInteger;

@Service
@RequiredArgsConstructor
public class AdminJustificationService {

    private final AttendanceJustificationRepository justificationRepository;
    private final AttendanceRecordRepository attendanceRecordRepository;
    private final AttendanceSessionRepository attendanceSessionRepository;

    @Transactional(readOnly = true)
    public List<AdminJustificationResponse> getJustifications(JustificationStatus status) {
        List<AttendanceJustification> justifications = status == null
                ? justificationRepository.findAllByOrderByCreatedAtDescIdDesc()
                : justificationRepository.findByStatusOrderByCreatedAtDescIdDesc(status);

        return justifications.stream().map(this::toResponse).toList();
    }

    @Transactional(readOnly = true)
    public AdminJustificationResponse getJustification(Long id) {
        return justificationRepository.findById(id)
                .map(this::toResponse)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justification not found"));
    }

    @Transactional
    public AdminJustificationResponse reviewJustification(Long id,
                                                          Long reviewerId,
                                                          AdminJustificationReviewRequest request) {
        if (request.status() == JustificationStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Review status must be APPROVED or REJECTED");
        }

        AttendanceJustification justification = justificationRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Justification not found"));

        justification.setStatus(request.status());
        justification.setAdminComment(normalizeOptional(request.adminComment()));
        justification.setReviewedBy(reviewerId);
        justification.setReviewedAt(LocalDateTime.now());

        syncAttendanceRecordStatus(justification, request.status());

        return toResponse(justificationRepository.save(justification));
    }

    @Transactional
    public void seedFromAbsentRecordsIfEmpty() {
        if (justificationRepository.count() > 0) {
            syncApprovedJustifications();
            return;
        }

        List<AttendanceRecord> absentRecords = attendanceRecordRepository.findAll().stream()
                .filter(record -> record.getStatus() == AttendanceStudentStatus.ABSENT)
                .limit(8)
                .toList();

        AtomicInteger index = new AtomicInteger();
        for (AttendanceRecord record : absentRecords) {
            AttendanceSession session = record.getSession();
            if (session == null) {
                session = attendanceSessionRepository.findById(record.getSessionId()).orElse(null);
            }
            if (session == null) {
                continue;
            }

            int currentIndex = index.getAndIncrement();
            AttendanceJustification justification = AttendanceJustification.builder()
                    .sessionId(record.getSessionId())
                    .studentId(record.getStudentId())
                    .groupId(record.getGroupId())
                    .studentFirstName(record.getFirstName())
                    .studentLastName(record.getLastName())
                    .studentEmail(record.getEmail())
                    .numApogee(record.getNumApogee())
                    .courseLabel(session.getCourseLabel())
                    .roomLabel(session.getRoomLabel())
                    .teacherFullName(session.getTeacherFullName())
                    .absenceStartedAt(session.getStartedAt())
                    .absenceEndedAt(session.getEndedAt() != null ? session.getEndedAt() : session.getEndsAt())
                    .motive(defaultMotive(currentIndex))
                    .attachmentLabel(defaultAttachmentLabel(currentIndex))
                    .status(defaultStatus(currentIndex))
                    .build();
            justificationRepository.save(justification);
            if (justification.getStatus() == JustificationStatus.APPROVED) {
                syncAttendanceRecordStatus(justification, JustificationStatus.APPROVED);
            }
        }
    }

    private void syncApprovedJustifications() {
        justificationRepository.findByStatusOrderByCreatedAtDescIdDesc(JustificationStatus.APPROVED)
                .forEach(justification -> syncAttendanceRecordStatus(justification, JustificationStatus.APPROVED));
    }

    private AdminJustificationResponse toResponse(AttendanceJustification justification) {
        return new AdminJustificationResponse(
                justification.getId(),
                justification.getSessionId(),
                justification.getStudentId(),
                justification.getGroupId(),
                justification.getStudentFirstName(),
                justification.getStudentLastName(),
                justification.getStudentEmail(),
                justification.getNumApogee(),
                justification.getCourseLabel(),
                justification.getRoomLabel(),
                justification.getTeacherFullName(),
                justification.getAbsenceStartedAt(),
                justification.getAbsenceEndedAt(),
                justification.getMotive(),
                justification.getAttachmentLabel(),
                justification.getStatus(),
                justification.getAdminComment(),
                justification.getReviewedBy(),
                justification.getReviewedAt(),
                justification.getCreatedAt(),
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

    private void syncAttendanceRecordStatus(AttendanceJustification justification, JustificationStatus reviewStatus) {
        attendanceRecordRepository.findBySessionIdAndStudentId(
                justification.getSessionId(),
                justification.getStudentId()
        ).ifPresent(record -> {
            if (reviewStatus == JustificationStatus.APPROVED) {
                markRecordJustified(record);
            } else if (reviewStatus == JustificationStatus.REJECTED) {
                restoreRecordAbsent(record);
            }
        });
    }

    private void markRecordJustified(AttendanceRecord record) {
        if (record.getStatus() != AttendanceStudentStatus.ABSENT) {
            return;
        }

        record.setStatus(AttendanceStudentStatus.JUSTIFIED);
        attendanceRecordRepository.save(record);

        attendanceSessionRepository.findById(record.getSessionId()).ifPresent(session -> {
            session.setAbsentCount(Math.max(0, session.getAbsentCount() - 1));
            attendanceSessionRepository.save(session);
        });
    }

    private void restoreRecordAbsent(AttendanceRecord record) {
        if (record.getStatus() != AttendanceStudentStatus.JUSTIFIED) {
            return;
        }

        record.setStatus(AttendanceStudentStatus.ABSENT);
        attendanceRecordRepository.save(record);

        attendanceSessionRepository.findById(record.getSessionId()).ifPresent(session -> {
            session.setAbsentCount(session.getAbsentCount() + 1);
            attendanceSessionRepository.save(session);
        });
    }

    private JustificationStatus defaultStatus(int index) {
        return switch (index % 5) {
            case 1 -> JustificationStatus.APPROVED;
            case 3 -> JustificationStatus.REJECTED;
            default -> JustificationStatus.PENDING;
        };
    }

    private String defaultMotive(int index) {
        return switch (index % 4) {
            case 1 -> "Convocation administrative deposee par l'etudiant.";
            case 2 -> "Participation a une activite academique externe.";
            case 3 -> "Document incomplet, demande a verifier par l'administration.";
            default -> "Certificat medical depose pour justifier cette absence.";
        };
    }

    private String defaultAttachmentLabel(int index) {
        return switch (index % 4) {
            case 1 -> "convocation-administrative.pdf";
            case 2 -> "attestation-activite.pdf";
            case 3 -> "piece-jointe-incomplete.pdf";
            default -> "certificat-medical.pdf";
        };
    }
}
