package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotNull;
import ma.eniad.attendanceservice.entity.enums.AttendanceSessionMethod;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

import java.time.LocalDateTime;

public record AttendanceStudentView(
        @NotNull Long studentId,
        @NotNull Long groupId,
        @NotNull String firstName,
        @NotNull String lastName,
        @NotNull @Email String email,
        String pfpUrl,
        @NotNull String numApogee,
        @NotNull AttendanceStudentStatus status,
        AttendanceSessionMethod markMethod,
        LocalDateTime markedAt
) {
}
