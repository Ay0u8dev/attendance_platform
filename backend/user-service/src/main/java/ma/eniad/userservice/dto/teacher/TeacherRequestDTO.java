package ma.eniad.userservice.dto.teacher;

import org.hibernate.validator.constraints.URL;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import lombok.ToString;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.NoArgsConstructor;

@Data
@ToString(exclude = {"email"})
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherRequestDTO {
    @NotBlank(message = "Email is required")
    @Email(message = "Email must be valid")
    @Size(max = 254, message = "Email must not exceed 254 characters")
    private String email;

    @NotBlank(message = "First name is required")
    @Size(max = 100, message = "First name must not exceed 100 characters")
    private String firstName;

    @NotBlank(message = "Last name is required")
    @Size(max = 100, message = "Last name must not exceed 100 characters")
    private String lastName;

    @URL(message = "Profile picture URL must be valid")
    @Size(max = 512, message = "Profile picture URL must not exceed 512 characters")
    private String pfpUrl;
}
