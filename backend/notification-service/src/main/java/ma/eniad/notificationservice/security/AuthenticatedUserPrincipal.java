package ma.eniad.notificationservice.security;

import java.security.Principal;
import java.util.Set;

public record AuthenticatedUserPrincipal(
        String userId,
        String email,
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
