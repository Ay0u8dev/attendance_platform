package ma.eniad.attendanceservice.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import ma.eniad.attendanceservice.entity.AttendanceSessionMethod;

import java.util.List;

public record CreateAttendanceSessionRequest(
        @NotEmpty(message = "At least one groupId is required")
        List<@NotNull(message = "Group id cannot be null") Long> groupIds,

        @NotBlank(message = "courseLabel is required")
        String courseLabel,

        @NotBlank(message = "roomLabel is required")
        String roomLabel,

        @NotNull(message = "method is required")
        AttendanceSessionMethod method,

        @NotBlank(message = "gpsLat is required")
        String gpsLat,

        @NotBlank(message = "gpsLon is required")
        String gpsLon
) {
}
