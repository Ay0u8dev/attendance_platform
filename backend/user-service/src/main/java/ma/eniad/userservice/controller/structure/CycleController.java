package ma.eniad.userservice.controller.structure;

import jakarta.validation.Valid;
import java.util.List;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.structure.CycleRequestDTO;
import ma.eniad.userservice.dto.structure.CycleResponseDTO;
import ma.eniad.userservice.service.structure.CycleService;
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
@RequestMapping("users/structure/cycles")
@RequiredArgsConstructor
public class CycleController {

    private final CycleService service;

    @PostMapping
    @RequireRole({"ADMIN"})
    public ResponseEntity<CycleResponseDTO> create(@Valid @RequestBody CycleRequestDTO request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(service.create(request));
    }

    @PutMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<CycleResponseDTO> update(
            @PathVariable Long id,
            @Valid @RequestBody CycleRequestDTO request) {
        return ResponseEntity.ok(service.update(id, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CycleResponseDTO> getById(@PathVariable Long id) {
        return ResponseEntity.ok(service.getById(id));
    }

    @GetMapping
    public ResponseEntity<List<CycleResponseDTO>> getAll() {
        return ResponseEntity.ok(service.getAll());
    }

    @DeleteMapping("/{id}")
    @RequireRole({"ADMIN"})
    public ResponseEntity<Void> delete(@PathVariable Long id) {
        service.delete(id);
        return ResponseEntity.noContent().build();
    }
}
