package ma.eniad.userservice.controller.inscription;

import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.inscription.InscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.InscriptionResponseDTO;
import ma.eniad.userservice.service.inscription.InscriptionService;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import jakarta.validation.Valid;

import java.util.List;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.http.ProblemDetail;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;  

@RestController
@RequestMapping("users/student/inscription")
@RequiredArgsConstructor
public class InscriptionController {
    private final InscriptionService inscriptionService;

    // Create Inscription
    @ApiResponses({
            @ApiResponse(responseCode = "201", description = "Inscription created successfully",
                    content = @Content(schema = @Schema(implementation = InscriptionResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "409", description = "Student already enrolled in the academic year",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @PostMapping
    public ResponseEntity<InscriptionResponseDTO> createInscription(@Valid @RequestBody InscriptionRequestDTO request) {
        InscriptionResponseDTO response = inscriptionService.createInscription(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    // Get Inscription by ID
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Inscription retrieved successfully",
                    content = @Content(schema = @Schema(implementation = InscriptionResponseDTO.class))),
            @ApiResponse(responseCode = "404", description = "Inscription not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @GetMapping("/{id}") 
    public ResponseEntity<InscriptionResponseDTO> getInscriptionById(@PathVariable Long id) {
        InscriptionResponseDTO response = inscriptionService.getInscriptionById(id);
        return ResponseEntity.ok(response);
    }

    // Get all Inscriptions
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Inscriptions retrieved successfully",
                    content = @Content(mediaType = "application/json",
                            array = @io.swagger.v3.oas.annotations.media.ArraySchema(
                                    schema = @Schema(implementation = InscriptionResponseDTO.class))))
    })  
    @GetMapping
    public ResponseEntity<List<InscriptionResponseDTO>> getAllInscriptions() {
        List<InscriptionResponseDTO> response = inscriptionService.getAllInscriptions();
        return ResponseEntity.ok(response);
    }

    // Update Inscription
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Inscription updated successfully",
                    content = @Content(schema = @Schema(implementation = InscriptionResponseDTO.class))),
            @ApiResponse(responseCode = "400", description = "Invalid request data",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class))),
            @ApiResponse(responseCode = "404", description = "Inscription not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @PutMapping("/{id}")
    public ResponseEntity<InscriptionResponseDTO> updateInscription(@PathVariable Long id, @Valid @RequestBody InscriptionRequestDTO request) {
        InscriptionResponseDTO response = inscriptionService.updateInscription(id, request);
        return ResponseEntity.ok(response);
    }

    // Delete Inscription
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Inscription deleted successfully"),
            @ApiResponse(responseCode = "404", description = "Inscription not found",
                    content = @Content(schema = @Schema(implementation = ProblemDetail.class)))
    })
    @RequireRole({"ADMIN"})
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteInscription(@PathVariable Long id) {
        inscriptionService.deleteInscription(id);
        return ResponseEntity.noContent().build();
    }  
}
