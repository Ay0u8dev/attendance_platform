package ma.eniad.userservice.service;

import lombok.Getter;

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

    @Getter
    public static class UserInfo {
        private final String userId;
        private final String userEmail;
        private final Set<String> roles;

        public UserInfo(String userId, String userEmail, Set<String> roles) {
            this.userId = userId;
            this.userEmail = userEmail;
            this.roles = roles;
        }

        public boolean hasAnyRole(String... requiredRoles) {
            return roles != null && requiredRoles != null && requiredRoles.length > 0
                    && Arrays.stream(requiredRoles).anyMatch(roles::contains);
        }
    }
}