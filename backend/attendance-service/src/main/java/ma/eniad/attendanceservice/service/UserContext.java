package ma.eniad.attendanceservice.service;

import java.util.Set;

public final class UserContext {

    private static final ThreadLocal<UserInfo> CURRENT_USER = new ThreadLocal<>();

    private UserContext() {
    }

    public static void setCurrentUser(String userId, String userEmail, Set<String> roles) {
        CURRENT_USER.set(new UserInfo(userId, userEmail, roles));
    }

    public static UserInfo getCurrentUser() {
        return CURRENT_USER.get();
    }

    public static void clear() {
        CURRENT_USER.remove();
    }

    public record UserInfo(String userId, String userEmail, Set<String> roles) {
        public boolean hasAnyRole(String... requiredRoles) {
            if (roles == null || roles.isEmpty() || requiredRoles == null || requiredRoles.length == 0) {
                return false;
            }

            for (String requiredRole : requiredRoles) {
                if (roles.contains(requiredRole)) {
                    return true;
                }
            }

            return false;
        }    }
}
