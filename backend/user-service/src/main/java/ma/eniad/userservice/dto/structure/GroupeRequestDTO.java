package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class GroupeRequestDTO {
	@NotBlank
	@Size(max = 60)
	private String name;

	@NotNull
	@Positive
	private Long formationId;
}
