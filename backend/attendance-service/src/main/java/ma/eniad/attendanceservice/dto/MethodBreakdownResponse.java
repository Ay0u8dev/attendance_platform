package ma.eniad.attendanceservice.dto;

public record MethodBreakdownResponse(
        long qrCodeSessions,
        long faceIdSessions,
        long manualSessions
) {
}
