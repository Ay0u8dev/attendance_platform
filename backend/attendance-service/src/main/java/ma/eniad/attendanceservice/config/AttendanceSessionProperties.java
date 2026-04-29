package ma.eniad.attendanceservice.config;

import jakarta.validation.constraints.NotNull;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import java.time.Duration;

@Validated
@ConfigurationProperties(prefix = "attendance.session")
public record AttendanceSessionProperties(
        @NotNull Duration autoEndDuration,
        @NotNull Duration finalizedStateRetention,
        @NotNull Duration autoFinalizePollInterval
) {
}
