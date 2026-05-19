package ma.eniad.attendanceservice.dto;

public record InternalTeacherIdentityDto(
        Long teacherId,
        String firstName,
        String lastName
) {
}
