package ma.eniad.attendanceservice.dto;

import java.time.LocalDateTime;

public record ApiErrorResponse(
        int status,
        String message,
        LocalDateTime timestamp,
        String path
) {
}
