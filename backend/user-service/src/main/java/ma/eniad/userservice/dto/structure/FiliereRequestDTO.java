package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FiliereRequestDTO {
	@NotBlank
	@Size(max = 20)
	private String code;

	@NotBlank
	@Size(max = 120)
	private String name;
}
