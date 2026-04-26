package ma.eniad.userservice.dto;

public record StudentRosterDto(
        Long studentId,
        Long groupId,
        String firstName,
        String lastName,
        String email,
        String numApogee
) {
}
