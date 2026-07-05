package ma.eniad.attendanceservice.controller;

import ma.eniad.attendanceservice.dto.AttendanceSessionDetailsResponse;
import ma.eniad.attendanceservice.service.AttendanceSessionReadService;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Set;

@RestController
@RequestMapping("/attendance/internal/sessions")
public class AttendanceInternalSessionController {

    private static final Set<String> TRUSTED_INTERNAL_SOURCES = Set.of("justification-service");

    private final AttendanceSessionReadService attendanceSessionReadService;
    private final String internalServiceToken;

    public AttendanceInternalSessionController(
            AttendanceSessionReadService attendanceSessionReadService,
            @Value("${attendance.internal.service-token:}") String internalServiceToken) {
        this.attendanceSessionReadService = attendanceSessionReadService;
        this.internalServiceToken = internalServiceToken;
    }

    @GetMapping("/{sessionId}")
    public ResponseEntity<AttendanceSessionDetailsResponse> getSessionInternally(
            @PathVariable Long sessionId,
            @RequestHeader(value = "X-Request-Source", required = false) String requestSource,
            @RequestHeader(value = "X-Internal-Service-Token", required = false) String internalToken) {
        validateInternalRequest(requestSource, internalToken);
        return ResponseEntity.ok(attendanceSessionReadService.getSessionForAdmin(sessionId));
    }

    private void validateInternalRequest(String source, String suppliedToken) {
        if (source == null || !TRUSTED_INTERNAL_SOURCES.contains(source)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service source");
        }

        if (internalServiceToken == null || internalServiceToken.isBlank()) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Internal authentication is not configured");
        }

        byte[] supplied = suppliedToken == null
                ? new byte[0]
                : suppliedToken.getBytes(StandardCharsets.UTF_8);

        if (!MessageDigest.isEqual(internalServiceToken.getBytes(StandardCharsets.UTF_8), supplied)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service credentials");
        }
    }
}
