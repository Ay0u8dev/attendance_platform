package ma.eniad.attendanceservice.dto;

public record AdminOverviewResponse(
        long totalSessions,
        long activeSessions,
        long finalizedSessions,
        long totalPresentMarks,
        long totalAbsentMarks,
        double attendanceRate,
        MethodBreakdownResponse methodBreakdown
) {
}
