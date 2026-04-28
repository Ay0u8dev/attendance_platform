package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;

public record LiveAttendanceStudentState(
        Long studentId,
        Long groupId,

        String firstName,
        String lastName,

        String numApogee,

        String status,

        LocalDateTime markedAt,

        String markMethod,

        String DeviceID
) {
}
