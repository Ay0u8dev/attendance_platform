package ma.eniad.justificationservice.service;

import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Locale;
import java.util.Set;
import java.util.stream.Collectors;

public record RequestUser(Long id, String email, Set<String> roles) {

    public static RequestUser fromHeaders(String userId, String rolesHeader, String email) {
        if (userId == null || rolesHeader == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authentication headers");
        }

        Long parsedId;
        try {
            parsedId = Long.valueOf(userId);
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authenticated user id");
        }

        Set<String> roles = Arrays.stream(rolesHeader.split(","))
                .map(String::trim)
                .filter(role -> !role.isEmpty())
                .map(role -> role.toUpperCase(Locale.ROOT))
                .map(role -> role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role)
                .collect(Collectors.toUnmodifiableSet());
        if (roles.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authenticated user role");
        }

        return new RequestUser(parsedId, email, roles);
    }

    public boolean hasRole(String role) {
        return roles.contains(role.toUpperCase(Locale.ROOT));
    }

    public void requireRole(String role) {
        if (!hasRole(role)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, role + " role required");
        }
    }

    public String primaryDecisionRole() {
        if (hasRole("ADMIN")) {
            return "ADMIN";
        }
        if (hasRole("TEACHER")) {
            return "TEACHER";
        }
        throw new ResponseStatusException(HttpStatus.FORBIDDEN, "ADMIN or TEACHER role required");
    }
}
