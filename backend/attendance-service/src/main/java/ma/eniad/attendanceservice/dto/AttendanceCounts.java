package ma.eniad.attendanceservice.dto;

public record AttendanceCounts(
        int presentCount,
        int absentCount,
        int unknownCount
) {
    public AttendanceCounts {
        if (presentCount < 0 || absentCount < 0 || unknownCount < 0) {
            throw new IllegalArgumentException(
                    "Attendance counts cannot be negative: presentCount=" + presentCount +
                            ", absentCount=" + absentCount + ", unknownCount=" + unknownCount
            );
        }
    }
}
