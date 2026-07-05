package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

@Getter
@Setter
public class FormationRequestDTO {
	@NotBlank
	@Size(max = 60)
	private String name;

	@NotNull
	@Positive
	private Long anneeUniversitaireId;
	
	@Positive
	private Long filiereId;

	@NotNull
	@Positive
	private Long cycleId;
}