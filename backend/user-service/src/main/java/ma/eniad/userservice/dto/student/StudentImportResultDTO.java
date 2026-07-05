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
    private int successfulRows;
    private int createdStudents;
    private int updatedStudents;
    private int createdInscriptions;
    private int duplicateInscriptions;
    private int failedRows;

    private int studentsCreated;
    private int studentsUpdated;
    private int inscriptionsCreated;
    private int rowsRejected;
    private int duplicatesSkipped;
    private int warningsCount;
    private int errorsCount;

    private int missingAcademicYears;
    private int missingFormations;
    private int missingGroups;

    private long processingTimeMs;


    private String status; // SUCCESS | PARTIAL | FAILED

    private List<StudentChangeDTO> changes;
    private List<RowErrorDTO> errors;
    private List<String> warnings;
}
