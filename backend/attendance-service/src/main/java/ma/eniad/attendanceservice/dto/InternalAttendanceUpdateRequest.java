package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;

public record InternalAttendanceUpdateRequest(
        @NotNull(message = "studentId is required")
        Long studentId,

        @NotNull(message = "method is required")
        AttendanceSessionMethod method,

        @NotBlank(message = "deviceId is required")
        String deviceId,

        @NotBlank(message = "gpsLat is required")
        String gpsLat,

        @NotBlank(message = "gpsLon is required")
        String gpsLon
) {
}
