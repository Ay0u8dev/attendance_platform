package ma.eniad.justificationservice.controller;

import java.io.IOException;
import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import jakarta.validation.Valid;
import ma.eniad.justificationservice.controller.dto.PresignedUrlResponse;
import ma.eniad.justificationservice.dto.ReviewJustificationRequest;
import ma.eniad.justificationservice.dto.SubmitJustificationRequest;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.JustificationStatus;
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
    public List<Justification> findAll(@RequestParam(required = false) JustificationStatus status,
                                       @RequestParam(required = false) Long studentId) {
        return service.findAll(status, studentId);
    }

    @GetMapping("/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getPresignedUrl(@RequestParam(required = false, defaultValue = "application/pdf") String contentType) {
        String extension = ".pdf";
        if ("image/jpeg".equals(contentType) || "image/jpg".equals(contentType)) extension = ".jpg";
        else if ("image/png".equals(contentType)) extension = ".png";
        else if ("image/webp".equals(contentType)) extension = ".webp";

        String key = "justifications/" + UUID.randomUUID().toString() + extension;
        String presignedUrl = r2Service.generatePresignedUploadUrl(key, contentType);
        return ResponseEntity.ok(PresignedUrlResponse.builder().url(presignedUrl).key(key).build());
    }

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Void> uploadFile(@RequestParam("key") String key,
                                           @RequestPart("file") MultipartFile file) throws IOException {
        if (r2Service.isR2Configured()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }

        r2Service.storeLocalUpload(key, file);
        return ResponseEntity.ok().build();
    }

    @PutMapping("/upload")
    public ResponseEntity<Void> uploadFilePut(@RequestParam("key") String key,
                                              @RequestBody byte[] fileBytes) throws IOException {
        if (r2Service.isR2Configured()) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).build();
        }
        if (fileBytes == null || fileBytes.length == 0) {
            return ResponseEntity.badRequest().build();
        }

        r2Service.storeLocalUpload(key, fileBytes);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{id}")
    public Justification findById(@PathVariable Long id) {
        return service.findById(id);
    }

    @PostMapping
    public Justification submit(@Valid @RequestBody SubmitJustificationRequest request) {
        return service.submit(request);
    }

    @PatchMapping("/pending")
    public List<Justification> markAllAsPending() {
        return service.markAllAsPending();
    }

    @PatchMapping("/{id}/approve")
    public Justification approve(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return service.approve(id, request);
    }

    @PatchMapping("/{id}/decline")
    public Justification decline(@PathVariable Long id,
                                 @Valid @RequestBody ReviewJustificationRequest request) {
        return service.decline(id, request);
    }
}
