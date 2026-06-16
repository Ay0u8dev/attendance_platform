package ma.eniad.attendanceservice.service;

import java.security.Principal;
import java.util.Set;

public record AuthenticatedUserPrincipal(
        String userId,
        String userEmail,
        Set<String> roles
) implements Principal {

    @Override
    public String getName() {
        return userId;
    }

    public boolean hasRole(String role) {
        return roles != null && roles.contains(role);
    }
}
