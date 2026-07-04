package ma.eniad.notificationservice.exception;

import java.time.LocalDateTime;

public record ApiErrorResponse(
        int status,
        String message,
        String path,
        LocalDateTime timestamp
) {
}
