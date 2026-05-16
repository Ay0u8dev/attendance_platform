package ma.eniad.userservice.dto.teacher.excel;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.eniad.userservice.dto.RowErrorDTO;

import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeacherImportResultDTO {
    private int totalRows;
    private int importedRows;
    private int failedRows;
    private List<RowErrorDTO> errors;
}
