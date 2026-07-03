package ma.eniad.attendanceservice.dto;

import java.util.List;

public record TeacherAttendanceReportFiliereResponse(
        String filiere,
        List<TeacherAttendanceReportSessionResponse> sessions,
        List<TeacherAttendanceReportStudentResponse> students
) {
}
