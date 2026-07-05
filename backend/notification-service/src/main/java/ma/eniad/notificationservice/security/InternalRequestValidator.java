package ma.eniad.notificationservice.security;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

@Component
public class InternalRequestValidator {
    private static final Set<String> TRUSTED_INTERNAL_SOURCES = Set.of(
            "attendance-service",
            "justification-service",
            "user-service",
            "auth-service"
    );

    @Value("${app.internal.service-token:}")
    private String internalServiceToken;

    public void validate(String source, String suppliedToken) {
        if (source == null || source.isBlank() || !TRUSTED_INTERNAL_SOURCES.contains(source)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service source");
        }

        if (internalServiceToken == null || internalServiceToken.isBlank()) {
            throw new ResponseStatusException(
                    HttpStatus.SERVICE_UNAVAILABLE,
                    "Internal authentication is not configured"
            );
        }

        if (suppliedToken == null || suppliedToken.isBlank()
                || !constantTimeEquals(internalServiceToken, suppliedToken)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service credentials");
        }
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }
}
