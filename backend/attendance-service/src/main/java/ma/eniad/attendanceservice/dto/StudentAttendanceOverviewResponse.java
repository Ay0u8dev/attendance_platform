package ma.eniad.attendanceservice.dto;

public record StudentAttendanceOverviewResponse(
        long totalSessions,
        long presents,
        long absences,
        double attendanceRate
) {
}
