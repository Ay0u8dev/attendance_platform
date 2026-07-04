package ma.eniad.notificationservice.security;

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
        public boolean hasRole(String role) {
            return roles != null && roles.contains(role);
        }
    }
}
