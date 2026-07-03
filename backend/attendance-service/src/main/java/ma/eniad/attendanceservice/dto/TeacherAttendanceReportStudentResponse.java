package ma.eniad.attendanceservice.dto;

import ma.eniad.attendanceservice.entity.AttendanceStudentStatus;

import java.util.Map;

public record TeacherAttendanceReportStudentResponse(
        Long studentId,
        String numApogee,
        String firstName,
        String lastName,
        String email,
        Long groupId,
        String groupeName,
        Map<Long, AttendanceStudentStatus> statusesBySessionId
) {
}
