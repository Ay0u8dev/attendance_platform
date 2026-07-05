package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;

public record AdminStudentAttendanceSummaryResponse(
        Long studentId,
        long totalSessions,
        long totalPresents,
        long totalAbsences,
        long justifiedAbsences,
        long unjustifiedAbsences,
        double totalAbsenceHours,
        double attendanceRate,
        LocalDateTime lastAbsenceAt
) {
}
