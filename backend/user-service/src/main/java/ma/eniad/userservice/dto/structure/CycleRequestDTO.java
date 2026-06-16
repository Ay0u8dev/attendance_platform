package ma.eniad.userservice.dto.structure;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.enums.CycleType;

@Getter
@Setter
public class CycleRequestDTO {
	@NotBlank
	@Size(max = 20)
	private String code;

	@NotBlank
	@Size(max = 120)
	private String name;

	@NotNull
	private CycleType type;
}
