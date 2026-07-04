package ma.eniad.justificationservice.controller;

import java.net.URI;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.PresignedUrlResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.service.CloudflareR2Service;
import ma.eniad.justificationservice.service.JustificationService;

@RestController
@RequestMapping("/justifications")
public class JustificationController {

    private final JustificationService service;
    private final CloudflareR2Service r2Service;

    public JustificationController(JustificationService service, CloudflareR2Service r2Service) {
        this.service = service;
        this.r2Service = r2Service;
    }

    @GetMapping
    public List<JustificationResponse> findAll(@RequestParam(required = false) JustificationStatus status,
                                                @RequestParam(required = false) Long studentId) {
        return service.findAll(status, studentId).stream()
                .map(this::toResponse)
                .toList();
    }

    @GetMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(
            @RequestParam(required = false, defaultValue = "application/pdf") String contentType,
            @RequestParam(required = false) String studentName,
            @RequestParam(required = false) String moduleName,
            @RequestParam(required = false) String sessionMonth,
            @RequestParam(required = false) String sessionDay,
            @RequestParam(required = false) String sessionStartTime,
            @RequestParam(required = false) String sessionEndTime) {
        if (!r2Service.isR2Configured()) {
            return ResponseEntity.status(HttpStatus.SERVICE_UNAVAILABLE).build();
        }

        String extension = ".pdf";
        if ("image/jpeg".equals(contentType) || "image/jpg".equals(contentType)) extension = ".jpg";
        else if ("image/png".equals(contentType)) extension = ".png";
        else if ("image/webp".equals(contentType)) extension = ".webp";

        String baseName = null;
        boolean hasSessionParts = false;
        if (studentName != null && !studentName.isBlank() && moduleName != null && !moduleName.isBlank()) {
            String cleanStudent = sanitizeForFilename(studentName);
            String cleanModule = sanitizeForFilename(moduleName);
            String cleanMonth = sanitizeForFilename(sessionMonth);
            String cleanDay = sanitizeForFilename(sessionDay);
            String cleanStartTime = sanitizeForFilename(sessionStartTime);
            String cleanEndTime = sanitizeForFilename(sessionEndTime);
            if (!cleanStudent.isEmpty() && !cleanModule.isEmpty()) {
                hasSessionParts = !cleanMonth.isEmpty()
                        && !cleanDay.isEmpty()
                        && !cleanStartTime.isEmpty()
                        && !cleanEndTime.isEmpty();

                if (hasSessionParts) {
                    baseName = cleanStudent + "_" + cleanModule + "_" + cleanMonth + "_" + cleanDay
                            + "_" + cleanStartTime + "-" + cleanEndTime;
                } else {
                    baseName = cleanStudent + "_" + cleanModule;
                }
            }
        }

        String key;
        if (baseName != null && !baseName.isEmpty()) {
            key = "justifications/" + baseName
                    + (hasSessionParts ? "" : "_" + UUID.randomUUID().toString())
                    + extension;
        } else {
            key = "justifications/" + UUID.randomUUID().toString() + extension;
        }

        String presignedUrl = r2Service.generatePresignedUploadUrl(key, contentType);
        return ResponseEntity.ok(PresignedUrlResponse.builder().url(presignedUrl).key(key).build());
    }

    private String sanitizeForFilename(String input) {
        if (input == null) return "";
        String normalized = java.text.Normalizer.normalize(input, java.text.Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replaceAll("\\s+", "");
        normalized = normalized.replaceAll("[^a-zA-Z0-9]", "");
        return normalized;
    }

    @GetMapping("/{id}")
    public JustificationResponse findById(@PathVariable Long id) {
        return toResponse(service.findById(id));
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Void> downloadDocument(@PathVariable Long id) {
        Justification justification = service.findById(id);
        String documentKey = justification.getDocumentUrl();
        if (documentKey == null || documentKey.isBlank()) {
            return ResponseEntity.notFound().build();
        }

        String downloadUrl = documentKey.startsWith("http")
                ? documentKey
                : r2Service.generatePresignedDownloadUrl(documentKey);

        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(downloadUrl))
                .build();
    }

    @PostMapping
    public JustificationResponse submit(@Valid @RequestBody SubmitJustificationRequest request) {
        return toResponse(service.submit(request));
    }

    @PatchMapping("/pending")
    public List<JustificationResponse> markAllAsPending() {
        return service.markAllAsPending().stream()
                .map(this::toResponse)
                .toList();
    }

    @PatchMapping("/{id}/approve")
    public JustificationResponse approve(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return toResponse(service.approve(id, request));
    }

    @PatchMapping("/{id}/decline")
    public JustificationResponse decline(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return toResponse(service.decline(id, request));
    }

    private JustificationResponse toResponse(Justification justification) {
        String documentUrl = justification.getDocumentUrl();
        String documentName = null;
        String downloadUrl = null;

        if (documentUrl != null && !documentUrl.isBlank()) {
            documentName = extractFileName(documentUrl);
            downloadUrl = "/api/justifications/" + justification.getId() + "/download";
        }

        return JustificationResponse.builder()
                .id(justification.getId())
                .sessionId(justification.getSessionId())
                .studentId(justification.getStudentId())
                .studentName(justification.getStudentName())
                .studentEmail(justification.getStudentEmail())
                .studentCode(justification.getStudentCode())
                .studentFormation(justification.getStudentFormation())
                .studentClass(justification.getStudentClass())
                .studentGroup(justification.getStudentGroup())
                .module(justification.getModule())
                .sessionDate(justification.getSessionDate())
                .status(justification.getStatus())
                .reason(justification.getReason())
                .submittedAt(justification.getSubmittedAt())
                .documentUrl(documentUrl)
                .documentName(documentName)
                .downloadUrl(downloadUrl)
                .teacherComment(justification.getTeacherComment())
                .reviewedBy(justification.getReviewedBy())
                .reviewerRole(justification.getReviewerRole())
                .reviewedAt(justification.getReviewedAt())
                .build();
    }

    private String extractFileName(String documentUrl) {
        if (documentUrl == null || documentUrl.isBlank()) {
            return null;
        }
        int queryIndex = documentUrl.indexOf('?');
        String path = queryIndex >= 0 ? documentUrl.substring(0, queryIndex) : documentUrl;
        int slashIndex = path.lastIndexOf('/');
        String fileName = slashIndex >= 0 ? path.substring(slashIndex + 1) : path;

        // Strip UUID prefix if present, e.g. "c4c491ae-766d-4afd-bb7a-bebdc48d80d8-filename.pdf"
        fileName = fileName.replaceFirst("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]", "");

        // Strip UUID suffix if present, e.g. "filename_c4c491ae-766d-4afd-bb7a-bebdc48d80d8.pdf"
        fileName = fileName.replaceFirst("[_-][0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\\.[a-zA-Z0-9]+$|$)", "");

        return fileName;
    }
}

