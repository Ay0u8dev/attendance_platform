package ma.eniad.userservice.controller.teacher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;

import ma.eniad.userservice.dto.teacher.TeacherImportResultDTO;
import ma.eniad.userservice.service.teacher.TeacherImportService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.mock.web.MockMultipartFile;

@ExtendWith(MockitoExtension.class)
class TeacherImportControllerTest {

    private TeacherImportController controller;

    @Mock
    private TeacherImportService teacherImportService;

    @BeforeEach
    void setUp() {
        controller = new TeacherImportController(teacherImportService);
    }

    @Test
    void importTeachers_returnsServiceResult() {
        MockMultipartFile file = new MockMultipartFile(
                "file",
                "teachers.xlsx",
                "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
                new byte[] {1}
        );
        TeacherImportResultDTO response = TeacherImportResultDTO.builder()
                .fileName("teachers.xlsx")
                .totalRows(2)
                .successfulRows(2)
                .status("SUCCESS")
                .warnings(List.of())
                .errors(List.of())
                .changes(List.of())
                .build();

        when(teacherImportService.importFromExcel(file)).thenReturn(response);

        TeacherImportResultDTO result = controller.importTeachers(file);

        assertThat(result).isSameAs(response);
        verify(teacherImportService).importFromExcel(file);
    }
}
