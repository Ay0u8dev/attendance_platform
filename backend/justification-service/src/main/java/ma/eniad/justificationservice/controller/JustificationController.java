package ma.eniad.justificationservice.controller;

import jakarta.validation.Valid;
import ma.eniad.justificationservice.controller.dto.PresignedUrlResponse;
import ma.eniad.justificationservice.dto.DecisionJustificationRequest;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
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
    public List<ma.eniad.justificationservice.controller.dto.JustificationResponse> findAll(
            @RequestParam(required = false) JustificationStatus status,
            @RequestParam(required = false) Long studentId
    ) {
        return service.findAll(status, studentId).stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @GetMapping("/admin")
    public List<ma.eniad.justificationservice.dto.JustificationResponse> findForAdmin(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForAdmin(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/teacher")
    public List<ma.eniad.justificationservice.dto.JustificationResponse> findForTeacher(
            @RequestParam(required = false) JustificationStatus status,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.findForTeacher(RequestUser.fromHeaders(userId, roles, email), status);
    }

    @GetMapping("/student")
    public List<ma.eniad.justificationservice.dto.JustificationResponse> findForStudent(
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
            @RequestParam(required = false) String moduleName
    ) {
        String extension = ".pdf";
        if ("image/jpeg".equals(contentType) || "image/jpg".equals(contentType)) {
            extension = ".jpg";
        } else if ("image/png".equals(contentType)) {
            extension = ".png";
        } else if ("image/webp".equals(contentType)) {
            extension = ".webp";
        }

        String baseName = null;
        if (studentName != null && !studentName.isBlank() && moduleName != null && !moduleName.isBlank()) {
            String cleanStudent = sanitizeForFilename(studentName);
            String cleanModule = sanitizeForFilename(moduleName);
            if (!cleanStudent.isEmpty() && !cleanModule.isEmpty()) {
                baseName = cleanStudent + "_" + cleanModule;
            }
        }

        String key = "justifications/"
                + (baseName == null || baseName.isEmpty() ? "" : baseName + "_")
                + UUID.randomUUID()
                + extension;
        String presignedUrl = r2Service.generatePresignedUploadUrl(key, contentType);
        return ResponseEntity.ok(PresignedUrlResponse.builder().url(presignedUrl).key(key).build());
    }

    @GetMapping("/{id}")
    public ma.eniad.justificationservice.controller.dto.JustificationResponse findById(@PathVariable Long id) {
        return toDocumentResponse(service.findById(id));
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
    public ma.eniad.justificationservice.controller.dto.JustificationResponse submit(
            @Valid @RequestBody SubmitJustificationRequest request
    ) {
        return toDocumentResponse(service.submit(request));
    }

    @PostMapping("/student")
    public ma.eniad.justificationservice.dto.JustificationResponse submitForStudent(
            @Valid @RequestBody SubmitJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.submit(RequestUser.fromHeaders(userId, roles, email), request);
    }

    @PatchMapping("/pending")
    public List<ma.eniad.justificationservice.controller.dto.JustificationResponse> markAllAsPending() {
        return service.markAllAsPending().stream()
                .map(this::toDocumentResponse)
                .toList();
    }

    @PatchMapping("/{id}/decision")
    public ma.eniad.justificationservice.dto.JustificationResponse decide(
            @PathVariable Long id,
            @Valid @RequestBody DecisionJustificationRequest request,
            @RequestHeader("X-User-Id") String userId,
            @RequestHeader("X-User-Roles") String roles,
            @RequestHeader(value = "X-User-Email", required = false) String email
    ) {
        return service.decide(id, RequestUser.fromHeaders(userId, roles, email), request);
    }

    @PatchMapping("/{id}/approve")
    public ma.eniad.justificationservice.controller.dto.JustificationResponse approve(
            @PathVariable Long id,
            @Valid @RequestBody ReviewJustificationRequest request
    ) {
        return toDocumentResponse(service.approve(id, request));
    }

    @PatchMapping("/{id}/decline")
    public ma.eniad.justificationservice.controller.dto.JustificationResponse decline(
            @PathVariable Long id,
            @Valid @RequestBody ReviewJustificationRequest request
    ) {
        return toDocumentResponse(service.decline(id, request));
    }

    private ma.eniad.justificationservice.controller.dto.JustificationResponse toDocumentResponse(Justification justification) {
        String documentUrl = justification.getDocumentUrl();
        String documentName = null;
        String downloadUrl = null;

        if (documentUrl != null && !documentUrl.isBlank()) {
            documentName = extractFileName(documentUrl);
            downloadUrl = "/api/justifications/" + justification.getId() + "/download";
        }

        return ma.eniad.justificationservice.controller.dto.JustificationResponse.builder()
                .id(justification.getId())
                .sessionId(justification.getSessionId())
                .studentId(justification.getStudentId())
                .studentName(justification.getStudentName())
                .studentCode(justification.getStudentCode())
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

    private String extractFileName(String documentUrl) {
        if (documentUrl == null || documentUrl.isBlank()) {
            return null;
        }
        int queryIndex = documentUrl.indexOf('?');
        String path = queryIndex >= 0 ? documentUrl.substring(0, queryIndex) : documentUrl;
        int slashIndex = path.lastIndexOf('/');
        String fileName = slashIndex >= 0 ? path.substring(slashIndex + 1) : path;
        fileName = fileName.replaceFirst("^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}[_-]", "");
        fileName = fileName.replaceFirst("[_-][0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}(?=\\.[a-zA-Z0-9]+$|$)", "");
        return fileName;
    }
}
