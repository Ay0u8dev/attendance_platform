package ma.eniad.attendanceservice.dto;

import java.time.LocalDate;
import java.util.List;

public record TeacherAttendanceReportResponse(
        LocalDate generatedAt,
        List<TeacherAttendanceReportFiliereResponse> filieres
) {
}
