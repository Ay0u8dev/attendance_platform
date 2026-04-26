package ma.eniad.attendanceservice.dto;

public record StudentRosterDto(
        Long studentId,
        Long groupId,
        String firstName,
        String lastName,
        String email,
        String numApogee
) {
}
