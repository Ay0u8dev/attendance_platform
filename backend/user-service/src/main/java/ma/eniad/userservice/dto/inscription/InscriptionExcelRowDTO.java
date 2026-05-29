package ma.eniad.userservice.dto.inscription;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class InscriptionExcelRowDTO {
    private String numApogee;

    private String formationName;

    private String groupeCode;

    private String academicYear;
}
