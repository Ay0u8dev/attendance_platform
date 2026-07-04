package ma.eniad.justificationservice.controller;

import jakarta.validation.Valid;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.JustificationResponse;
import ma.eniad.justificationservice.dto.PresignedUrlResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.JustificationStatus;
import ma.eniad.justificationservice.service.CloudflareR2Service;
import ma.eniad.justificationservice.service.JustificationService;
import ma.eniad.justificationservice.service.RequestUser;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.text.Normalizer;
import java.util.List;
import java.util.UUID;

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
    public List<JustificationResponse> findAll(
            @RequestParam(required = false) JustificationStatus status,
            @RequestParam(required = false) Long studentId
    ) {
        return service.findAll(status, studentId);
    }

    @GetMapping("/admin")
    public List<JustificationResponse> findForAdmin(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForAdmin(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/teacher")
    public List<JustificationResponse> findForTeacher(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForTeacher(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/student")
    public List<JustificationResponse> findForStudent(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForStudent(RequestUser.fromHeaders(userId, roles, email), status);
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
        if ("image/jpeg".equals(contentType) || "image/jpg".equals(contentType)) {
            extension = ".jpg";
        } else if ("image/png".equals(contentType)) {
            extension = ".png";
        } else if ("image/webp".equals(contentType)) {
            extension = ".webp";
        }

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

    @GetMapping("/{id}")
    public JustificationResponse findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @GetMapping("/{id}/download")
    public ResponseEntity<Void> downloadDocument(@PathVariable Long id) {
        Justification justification = service.findEntityById(id);
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
    public JustificationResponse submit(
            @Valid @RequestBody SubmitJustificationRequest request
    ) {
        return service.submit(request);
    }

    @PostMapping("/student")
    public JustificationResponse submitForStudent(
            @Valid @RequestBody SubmitJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.submit(RequestUser.fromHeaders(userId, roles, email), request);
    }

    @PatchMapping("/pending")
    public List<JustificationResponse> markAllAsPending() {
        return service.markAllAsPending();
    }

    @PatchMapping("/{id}/decision")
    public JustificationResponse decide(
            @PathVariable Long id,
            @Valid @RequestBody DecisionJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.decide(id, RequestUser.fromHeaders(userId, roles, email), request);
    }

    @PatchMapping("/{id}/approve")
    public JustificationResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody ReviewJustificationRequest request
    ) {
        return service.approve(id, request);
    }

    @PatchMapping("/{id}/decline")
    public JustificationResponse decline(
            @PathVariable Long id,
            @Valid @RequestBody ReviewJustificationRequest request
    ) {
        return service.decline(id, request);
    }

    private String sanitizeForFilename(String input) {
        if (input == null) {
            return "";
        }
        String normalized = Normalizer.normalize(input, Normalizer.Form.NFD);
        normalized = normalized.replaceAll("\\p{M}", "");
        normalized = normalized.replaceAll("\\s+", "");
        normalized = normalized.replaceAll("[^a-zA-Z0-9]", "");
        return normalized;
    }

}
