package ma.eniad.userservice.dto.student;

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
public class StudentExcelRowDTO {
    private int rowNumber;

    private String firstName;

    private String lastName;

    @Email(message = "Email invalid format")
    private String email;

    private String numApogee;

    private String academicYear;

    private String formationName;

    private String groupeCode;
}
