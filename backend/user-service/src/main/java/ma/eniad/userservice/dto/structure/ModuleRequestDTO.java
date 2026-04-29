package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class ModuleRequestDTO {
	@NotBlank
	@Size(max = 120)
	private String name;

	@NotBlank
	@Size(max = 30)
	private String code;

	@Positive
	private Integer semester;

	@Positive
	private Integer hours;

	@NotNull
	@Positive
	private Long formationId;
}
