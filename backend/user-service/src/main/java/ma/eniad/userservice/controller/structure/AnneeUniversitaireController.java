package ma.eniad.userservice.controller.structure;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.structure.AnneeRequestDTO;
import ma.eniad.userservice.dto.structure.AnneeResponseDTO;
import ma.eniad.userservice.service.structure.AnneeUniversitaireService;
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
@RequestMapping("users/structure/annees")
@RequiredArgsConstructor
public class AnneeUniversitaireController {

    private final AnneeUniversitaireService service;

    @PostMapping
    @RequireRole({"ADMIN"})
    public ResponseEntity<AnneeResponseDTO> create(@Valid @RequestBody AnneeRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<AnneeResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody AnneeRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<AnneeResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<AnneeResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @DeleteMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
