package ma.eniad.userservice.controller.student;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.dto.student.StudentImportResultDTO;
import ma.eniad.userservice.service.student.StudentImportService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class StudentImportControllerTest {

    private StudentImportController controller;

    @Mock
    private StudentImportService studentImportService;

    @BeforeEach
    void setUp() {
        controller = new StudentImportController(studentImportService);
    }

    @Test
    void importStudents_returnsServiceResult() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "students.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[] {1}
        );
        StudentImportResultDTO response = StudentImportResultDTO.builder()
                .fileName("students.xlsx")
                .totalRows(2)
                .successfulRows(2)
                .status("SUCCESS")
                .warnings(List.of())
                .errors(List.of())
                .changes(List.of())
                .build();

        when(studentImportService.importFromExcel(file)).thenReturn(response);

        StudentImportResultDTO result = controller.importStudents(file);

        assertThat(result).isSameAs(response);
        verify(studentImportService).importFromExcel(file);
    }
}
