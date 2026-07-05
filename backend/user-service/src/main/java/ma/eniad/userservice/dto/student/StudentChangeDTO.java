package ma.eniad.userservice.dto.student;

import java.util.List;

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
public class StudentChangeDTO {
    private int rowNumber;

    private String apogee;

    private String email;

    private String action; 
    // CREATED | UPDATED | SKIPPED

    private List<String> changes;
}
