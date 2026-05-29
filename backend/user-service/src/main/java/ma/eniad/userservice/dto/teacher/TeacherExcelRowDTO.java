package ma.eniad.userservice.dto.teacher;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import jakarta.validation.constraints.Email;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TeacherExcelRowDTO {
    private int rowNumber;

    private String firstName;

    private String lastName;

    @Email(message = "Email invalid format")
    private String email;
}
