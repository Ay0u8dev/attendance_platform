package ma.eniad.userservice.controller.teacher;

import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ProblemDetail;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.parameters.RequestBody;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.service.teacher.TeacherService;

@RestController
@RequestMapping("users/teacher")
public class TeacherController {
    private final TeacherService service;

    public TeacherController(TeacherService service) {
        this.service = service;
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