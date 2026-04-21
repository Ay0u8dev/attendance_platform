package ma.eniad.userservice.service;

import java.util.Arrays;
import java.util.Set;

public class UserContext {
    private static final ThreadLocal<UserInfo> currentUser = new ThreadLocal<>();

    public static void setCurrentUser(String userId, String userEmail, Set<String> roles) {
        currentUser.set(new UserInfo(userId, userEmail, roles != null ? Set.copyOf(roles) : null));
    }

    public static UserInfo getCurrentUser() {
        return currentUser.get();
    }

    public static void clear() {
        currentUser.remove();
    }

    public record UserInfo(String userId, String userEmail, Set<String> roles) {
        public boolean hasAnyRole(String... requiredRoles) {
            return roles != null && requiredRoles != null && requiredRoles.length > 0
                    && Arrays.stream(requiredRoles).anyMatch(roles::contains);
        }
    }
}