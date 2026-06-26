package ma.eniad.userservice.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.service.UserContext;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.util.Arrays;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleCheckInterceptor implements HandlerInterceptor {

    private static final String FACE_PROFILE_PATH_PREFIX = "/users/internal/students/";
    private static final String FACE_PROFILE_PATH_SUFFIX = "/face-profile";
    private static final String PUBLIC_PROFILE_PHOTOS_PATH_PREFIX = "/users/public/profile-photos/";

    @Value("${app.internal.face-service-token:}")
    private String faceServiceToken;

    @Override
    public boolean preHandle(HttpServletRequest request,
                             @NonNull HttpServletResponse response,
                             @NonNull Object handler) {

        // 1. Extract headers and set user context
        String userId = request.getHeader("X-User-Id");
        String rolesHeader = request.getHeader("X-User-Roles");
        String userEmail = request.getHeader("X-User-Email");
        String source = request.getHeader("X-Request-Source");

        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        if (Objects.equals(source, "auth-service")) {
            return true; // Skip checks for auth-service calls
        }

        if (isPublicProfilePhotoPath(request)) {
            return true;
        }

        if (isFaceProfilePath(request)) {
            if (!Objects.equals(source, "face-service")) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service source");
            }
            if (faceServiceToken == null || faceServiceToken.isBlank()) {
                throw new ResponseStatusException(
                        HttpStatus.SERVICE_UNAVAILABLE,
                        "Face-service authentication is not configured"
                );
            }

            String suppliedToken = request.getHeader("X-Internal-Service-Token");
            if (suppliedToken == null || suppliedToken.isBlank() || !constantTimeEquals(faceServiceToken, suppliedToken)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid internal service credentials");
            }
            return true;
        }

        if (Objects.equals(source, "attendance-service")
                && request.getRequestURI() != null
                && request.getRequestURI().startsWith("/users/internal/")) {
            return true; // Skip checks for attendance-service internal calls
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
        if (handler instanceof HandlerMethod) {
            HandlerMethod handlerMethod = (HandlerMethod) handler;
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

        return true; // Allow the request to proceed
    }

    private boolean isFaceProfilePath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        return requestUri != null
                && requestUri.startsWith(FACE_PROFILE_PATH_PREFIX)
                && requestUri.endsWith(FACE_PROFILE_PATH_SUFFIX);
    }

    private boolean isPublicProfilePhotoPath(HttpServletRequest request) {
        String requestUri = request.getRequestURI();
        return "GET".equalsIgnoreCase(request.getMethod())
                && requestUri != null
                && requestUri.startsWith(PUBLIC_PROFILE_PHOTOS_PATH_PREFIX);
    }

    private boolean constantTimeEquals(String expected, String actual) {
        return MessageDigest.isEqual(
                expected.getBytes(StandardCharsets.UTF_8),
                actual.getBytes(StandardCharsets.UTF_8)
        );
    }

    @Override
    public void afterCompletion(@NonNull HttpServletRequest request,
                                @NonNull HttpServletResponse response,
                                @NonNull Object handler, Exception ex) {
        UserContext.clear(); // Clean up ThreadLocal
    }
}
