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
    private long processingTimeMs;
    private int totalRows;
    private int successfulRows;
    private int failedRows;
    private int createdTeachers;
    private int updatedTeachers;
    private int createdAssignments;
    private int duplicateAssignments;
    private int duplicateAssignmentsInsideFile;
    private int missingAcademicYears;
    private int missingFormations;
    private int missingGroups;
    private int missingModules;
    private int nonTeacherEmailConflicts;
    private String status; // SUCCESS | PARTIAL | FAILED
    private List<TeacherChangeDTO> changes;
    private List<RowErrorDTO> errors;
    private List<String> warnings;
}
