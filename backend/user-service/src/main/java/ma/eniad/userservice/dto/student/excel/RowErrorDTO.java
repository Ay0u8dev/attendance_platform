package ma.eniad.userservice.dto.student.excel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RowErrorDTO {
    private int rowNumber;
    private String field;
    private String message;
}
