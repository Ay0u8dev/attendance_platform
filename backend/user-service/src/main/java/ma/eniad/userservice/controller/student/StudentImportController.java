package ma.eniad.userservice.controller.student;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.student.excel.StudentImportResultDTO;
import ma.eniad.userservice.service.student.StudentImportService;

@RestController
@RequestMapping("users/student")
@RequiredArgsConstructor
public class StudentImportController {
    private final StudentImportService studentImportService;

    @PostMapping(
        value = "/import",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @RequireRole({"ADMIN"})
    public StudentImportResultDTO importStudents(
        @RequestPart("file") MultipartFile file
    ) {
        return studentImportService.importFromExcel(file);
    }
}
