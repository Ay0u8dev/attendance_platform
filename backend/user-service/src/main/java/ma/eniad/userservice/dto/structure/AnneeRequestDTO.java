package ma.eniad.userservice.dto.structure;

import java.time.LocalDate;

import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class AnneeRequestDTO {
	@NotBlank
	@Size(max = 20)
	private String name;

	@NotNull
	private LocalDate startDate;

	@NotNull
	private LocalDate endDate;

	private boolean active;

	@AssertTrue
	public boolean isValidAcademicYear() {
		return startDate != null && endDate != null && !startDate.isAfter(endDate);
	}
}
