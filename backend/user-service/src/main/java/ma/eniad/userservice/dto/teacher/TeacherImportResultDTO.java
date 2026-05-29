package ma.eniad.userservice.dto.teacher;

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
public class TeacherImportResultDTO {
    private String fileName;
    private LocalDateTime importedAt;

    private int totalRows;
    private int createdTeachers;
    private int updatedTeachers;
    private int failedRows;


    private String status; // SUCCESS | PARTIAL | FAILED

    private List<TeacherChangeDTO> changes;
    private List<RowErrorDTO> errors;
    private List<String> warnings;
}
