package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotNull;
import ma.eniad.attendanceservice.entity.enums.AttendanceStudentStatus;

public record ManualAttendanceUpdateRequest(
        @NotNull(message = "studentId is required")
        Long studentId,

        @NotNull(message = "status is required")
        AttendanceStudentStatus status
) {
}
