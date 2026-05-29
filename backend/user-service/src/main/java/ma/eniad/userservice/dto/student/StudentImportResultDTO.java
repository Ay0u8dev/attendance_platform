package ma.eniad.userservice.dto.student;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.eniad.userservice.dto.excel.RowErrorDTO;

import java.time.LocalDateTime;
import java.util.List;

@Getter
@Setter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentImportResultDTO {
    private String fileName;
    private LocalDateTime importedAt;

    private int totalRows;
    private int createdStudents;
    private int updatedStudents;
    private int failedRows;


    private String status; // SUCCESS | PARTIAL | FAILED

    private List<StudentChangeDTO> changes;
    private List<RowErrorDTO> errors;
    private List<String> warnings;
}
