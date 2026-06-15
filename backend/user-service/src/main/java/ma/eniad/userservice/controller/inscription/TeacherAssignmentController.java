package ma.eniad.userservice.controller.inscription;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentRequestDTO;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentResponseDTO;
import ma.eniad.userservice.service.inscription.TeacherAssignmentService;

@RestController
@RequestMapping("/api/teacher-assignments")
@RequiredArgsConstructor
public class TeacherAssignmentController {
    private final TeacherAssignmentService service;

    @PostMapping
    @RequireRole({"ADMIN"})
    public ResponseEntity<TeacherAssignmentResponseDTO> create(
            @Valid @RequestBody TeacherAssignmentRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @GetMapping
    public ResponseEntity<List<TeacherAssignmentResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeacherAssignmentResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @PutMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<TeacherAssignmentResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody TeacherAssignmentRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @DeleteMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
