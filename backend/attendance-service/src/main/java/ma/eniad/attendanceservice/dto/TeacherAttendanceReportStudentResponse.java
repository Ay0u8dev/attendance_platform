package ma.eniad.attendanceservice.dto;

import java.util.Map;

import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

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
