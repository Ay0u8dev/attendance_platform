package ma.eniad.userservice.dto;

public record InternalTeacherIdentityDto(
        Long teacherId,
        String firstName,
        String lastName
) {
}
