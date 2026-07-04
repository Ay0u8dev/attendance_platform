package ma.eniad.userservice.controller.teacher;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;


import org.springframework.web.bind.annotation.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.controller.dto.PresignedUrlResponse;
import ma.eniad.userservice.dto.student.UpdateProfilePhotoRequest;
import ma.eniad.userservice.dto.teacher.TeacherProfileDto;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.service.CloudflareR2Service;
import ma.eniad.userservice.service.teacher.TeacherService;

@RestController
@RequestMapping("users/teacher")
public class TeacherController {
    private final TeacherService service;
    private final CloudflareR2Service r2Service;

    public TeacherController(TeacherService service, CloudflareR2Service r2Service) {
        this.service = service;
        this.r2Service = r2Service;
    }


    // POST /users/teacher
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Teacher created successfully",
                    content = @Content(schema = @Schema(implementation = TeacherResponseDTO.class))),
            @ApiResponse(responseCode = "409", description = "Email already in use",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))
            )
    })
    @RequireRole({"ADMIN"})
    @PostMapping
    public ResponseEntity<TeacherResponseDTO> create(@Valid @RequestBody TeacherRequestDTO request) {
        TeacherResponseDTO response = service.create(request);
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(response);
    }

    // GET /users/teacher
    @RequireRole({"ADMIN"})
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of teachers retrieved successfully",
                    content = @Content(mediaType = "application/json",
                            array = @io.swagger.v3.oas.annotations.media.ArraySchema(
                                    schema = @Schema(implementation = TeacherResponseDTO.class))))
    })    
    @GetMapping
    public ResponseEntity<List<TeacherResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teacher profile retrieved successfully",
                    content = @Content(schema = @Schema(implementation = TeacherProfileDto.class)))
    })
    @RequireRole({"TEACHER"})
    @GetMapping("/profile")
    public ResponseEntity<TeacherProfileDto> getProfile() {
        return ResponseEntity.ok(service.getCurrentProfile());
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teacher profile photo updated successfully",
                    content = @Content(schema = @Schema(implementation = TeacherProfileDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid image file",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"TEACHER"})
    @PutMapping(value = "/profile/photo")
    public ResponseEntity<TeacherProfileDto> updateProfilePhoto(
            @Valid @RequestBody UpdateProfilePhotoRequest request) {
        return ResponseEntity.ok(service.updateCurrentProfilePhoto(request.getPfpUrl()));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Presigned URL generated successfully",
                    content = @Content(schema = @Schema(implementation = PresignedUrlResponse.class)))
    })
    @RequireRole({"TEACHER"})
    @GetMapping(value = "/profile/photo/presigned-url")
    public ResponseEntity<PresignedUrlResponse> getProfilePhotoPresignedUrl(
            @RequestParam(required = false, defaultValue = "image/jpeg") String contentType) {
        String extension = ".jpg";
        if ("image/png".equals(contentType)) {
            extension = ".png";
        } else if ("image/webp".equals(contentType)) {
            extension = ".webp";
        } else if ("image/gif".equals(contentType)) {
            extension = ".gif";
        }

        String key = "profile-photos/" + UUID.randomUUID() + extension;
        String presignedUrl = r2Service.generatePresignedUploadUrl(key, contentType);
        return ResponseEntity.ok(PresignedUrlResponse.builder().url(presignedUrl).key(key).build());
    }

    // GET /users/teacher/{id}
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teacher retrieved successfully",
                    content = @Content(schema = @Schema(implementation = TeacherResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Teacher not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<TeacherResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    // PUT /users/teacher/{id}
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Teacher updated successfully",
                    content = @Content(schema = @Schema(implementation = TeacherResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Teacher not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Email already in use",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))
            )
    })
    @RequireRole({"ADMIN"})
    @PutMapping("/{id}")
    public ResponseEntity<TeacherResponseDTO> update(@PathVariable Long id, @Valid @RequestBody TeacherRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    // DELETE /users/teacher/{id}
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Teacher deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Teacher not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
