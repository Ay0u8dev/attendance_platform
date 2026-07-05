package ma.eniad.userservice.controller.structure;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.service.structure.FormationService;
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

@RestController
@RequestMapping("users/structure/formations")
@RequiredArgsConstructor
public class FormationController {

    private final FormationService service;

    @PostMapping
    @RequireRole({"ADMIN"})
    public ResponseEntity<FormationResponseDTO> create(@Valid @RequestBody FormationRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<FormationResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody FormationRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormationResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<FormationResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @DeleteMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
