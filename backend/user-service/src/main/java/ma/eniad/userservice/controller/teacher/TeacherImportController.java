package ma.eniad.userservice.controller.teacher;

import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import org.springframework.http.MediaType;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.dto.teacher.TeacherImportResultDTO;
import ma.eniad.userservice.service.teacher.TeacherImportService;

@RestController
@RequestMapping("users/teacher")
@RequiredArgsConstructor
public class TeacherImportController {
    private final TeacherImportService teacherImportService;

    @PostMapping(
        value = "/import",
        consumes = MediaType.MULTIPART_FORM_DATA_VALUE
    )
    @RequireRole({"ADMIN"})
    public TeacherImportResultDTO importTeachers(
        @RequestPart("file") MultipartFile file
    ) {
        return teacherImportService.importFromExcel(file);
    }
}
