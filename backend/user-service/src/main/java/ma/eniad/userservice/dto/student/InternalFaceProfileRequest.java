package ma.eniad.userservice.dto.student;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Builder;
import lombok.Setter;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InternalFaceProfileRequest {

    @NotBlank
    @Size(max = 1024)
    private String embedding;

    @NotNull
    private Integer dimension;

    @NotBlank
    @Size(max = 64)
    private String model;

    @NotBlank
    @Size(max = 64)
    private String format;
}
