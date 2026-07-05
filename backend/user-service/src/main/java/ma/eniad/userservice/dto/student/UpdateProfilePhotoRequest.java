package ma.eniad.userservice.dto.student;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateProfilePhotoRequest {
    @NotBlank(message = "Profile photo URL cannot be empty")
    private String pfpUrl;
}
