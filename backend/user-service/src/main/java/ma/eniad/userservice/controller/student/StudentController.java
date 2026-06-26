package ma.eniad.userservice.controller.student;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.student.StudentProfileDto;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.service.student.StudentService;

@RestController
@RequestMapping("users/student")
public class StudentController {

    private final StudentService service;

    public StudentController(StudentService service) {
        this.service = service;
    }

    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Student created successfully",
                    content = @Content(schema = @Schema(implementation = StudentResponseDTO.class))),
            @ApiResponse(responseCode = "409", description = "Email or apogee number already in use",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @PostMapping
    public ResponseEntity<StudentResponseDTO> create(@Valid @RequestBody StudentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.create(request));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "List of students retrieved successfully",
                    content = @Content(mediaType = "application/json",
                            array = @io.swagger.v3.oas.annotations.media.ArraySchema(
                                    schema = @Schema(implementation = StudentResponseDTO.class))))
    })
    @GetMapping
    public ResponseEntity<List<StudentResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student profile retrieved successfully",
                    content = @Content(schema = @Schema(implementation = StudentProfileDto.class)))
    })
    @RequireRole({"STUDENT"})
    @GetMapping("/profile")
    public ResponseEntity<StudentProfileDto> getProfile() {
        return ResponseEntity.ok(service.getCurrentProfile());
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student profile photo updated successfully",
                    content = @Content(schema = @Schema(implementation = StudentProfileDto.class))),
            @ApiResponse(responseCode = "400", description = "Invalid image file",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"STUDENT"})
    @PutMapping(value = "/profile/photo", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<StudentProfileDto> updateProfilePhoto(
            @RequestPart("file") MultipartFile file) {
        return ResponseEntity.ok(service.updateCurrentProfilePhoto(file));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Students in group retrieved successfully",
                    content = @Content(mediaType = "application/json",
                            array = @io.swagger.v3.oas.annotations.media.ArraySchema(
                                    schema = @Schema(implementation = StudentResponseDTO.class)))),
            @ApiResponse(responseCode = "404", description = "Group not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/groupe/{groupeId}")
    public ResponseEntity<List<StudentResponseDTO>> getByGroupeId(@PathVariable Long groupeId) {
        return ResponseEntity.ok(service.getByGroupeId(groupeId));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student retrieved successfully",
                    content = @Content(schema = @Schema(implementation = StudentResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Student not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/{id}")
    public ResponseEntity<StudentResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Student updated successfully",
                    content = @Content(schema = @Schema(implementation = StudentResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Student not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Email or apogee number already in use",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "422", description = "Validation failed",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @PutMapping("/{id}")
    public ResponseEntity<StudentResponseDTO> update(@PathVariable Long id,
                                                     @Valid @RequestBody StudentRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Student deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Student not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}