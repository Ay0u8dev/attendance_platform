package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FormationRequestDTO {
	@NotNull
	@Positive
	private Long anneeUniversitaireId;
	
	@Positive
	private Long filiereId;

	@NotNull
	@Positive
	private Long cycleId;
}
