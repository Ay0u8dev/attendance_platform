package ma.eniad.userservice.dto;

public final class InternalTeacherIdentityDto {

    private final Long teacherId;
    private final String firstName;
    private final String lastName;

    public InternalTeacherIdentityDto(Long teacherId, String firstName, String lastName) {
        this.teacherId = teacherId;
        this.firstName = firstName;
        this.lastName = lastName;
    }

    public Long teacherId() {
        return teacherId;
    }

    public String firstName() {
        return firstName;
    }

    public String lastName() {
        return lastName;
    }

    public Long getTeacherId() {
        return teacherId;
    }

    public String getFirstName() {
        return firstName;
    }

    public String getLastName() {
        return lastName;
    }
}
