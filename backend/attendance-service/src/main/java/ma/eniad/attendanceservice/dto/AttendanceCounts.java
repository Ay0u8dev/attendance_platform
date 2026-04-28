package ma.eniad.attendanceservice.dto;

public record AttendanceCounts(
        int presentCount,
        int absentCount,
        int unknownCount
) {
}
