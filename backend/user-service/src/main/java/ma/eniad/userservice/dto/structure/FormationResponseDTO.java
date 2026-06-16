package ma.eniad.userservice.dto.structure;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FormationResponseDTO {
	private Long id;
	private Long anneeUniversitaireId;
	private Long filiereId;
	private Long cycleId;
}
