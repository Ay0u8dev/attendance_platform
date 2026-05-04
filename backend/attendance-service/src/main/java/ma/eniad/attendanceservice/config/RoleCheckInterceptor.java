package ma.eniad.attendanceservice.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.eniad.attendanceservice.annotation.RequireRole;
import ma.eniad.attendanceservice.service.UserContext;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleCheckInterceptor implements HandlerInterceptor {

    private static final Set<String> TRUSTED_INTERNAL_SOURCES = Set.of("auth-service", "qr-service", "face-service");

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {

        String userId = request.getHeader("X-User-Id");
        String rolesHeader = request.getHeader("X-User-Roles");
        String userEmail = request.getHeader("X-User-Email");
        String source = request.getHeader("X-Request-Source");
        String requestUri = request.getRequestURI();

        if (Objects.equals(source, "auth-service")) {
            return true;
        }

        if (requestUri.startsWith("/attendance/internal/") && TRUSTED_INTERNAL_SOURCES.contains(source)) {
            return true;
        }

        if (userId == null || rolesHeader == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing auth headers");
        }

        Set<String> roles = Arrays.stream(rolesHeader.split(","))
                .map(String::trim)
                .filter(s -> !s.isEmpty())
                .collect(Collectors.toSet());
        UserContext.setCurrentUser(userId, userEmail, roles);

        try {
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
        } catch (ResponseStatusException ex) {
            UserContext.clear();
            throw ex;
        }


        return true;
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
                                @NonNull HttpServletResponse response,
                                @NonNull Object handler,
                                Exception ex) {
        UserContext.clear();
    }
}
