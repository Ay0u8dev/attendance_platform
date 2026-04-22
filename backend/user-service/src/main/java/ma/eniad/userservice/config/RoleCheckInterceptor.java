package ma.eniad.userservice.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.service.UserContext;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleCheckInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {

        // 1. Extract headers and set user context
        String userId = request.getHeader("X-User-Id");
        String rolesHeader = request.getHeader("X-User-Roles");
        String userEmail = request.getHeader("X-User-Email");
        String source = request.getHeader("X-Request-Source");

        if (Objects.equals(source, "auth-service")) {
            return true; // Skip checks for auth-service calls
        }

        if (userId == null || rolesHeader == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing auth headers");
        }

        Set<String> roles = Arrays.stream(rolesHeader.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        UserContext.setCurrentUser(userId, userEmail, roles);

        // 2. Check for @RequireRole annotation
        if (handler instanceof HandlerMethod handlerMethod) {
            RequireRole requireRole = handlerMethod.getMethodAnnotation(RequireRole.class);

            if (requireRole != null) {
                UserContext.UserInfo user = UserContext.getCurrentUser();
                String[] requiredRoles = requireRole.value();

                if (!user.hasAnyRole(requiredRoles)) {
                    throw new ResponseStatusException(
                            HttpStatus.FORBIDDEN,
                            "Insufficient roles. Required: " + Arrays.toString(requiredRoles)
                    );
                }
            }
        }

        return true; // ✅ Allow the request to proceed
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
                                @NonNull HttpServletResponse response,
                                @NonNull Object handler, Exception ex) {
        UserContext.clear(); // Clean up ThreadLocal
    }
}