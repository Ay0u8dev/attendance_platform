package ma.eniad.notificationservice.security;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.jspecify.annotations.NonNull;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class AuthHeaderInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(
            HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler
    ) {
        if ("OPTIONS".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String uri = request.getRequestURI();

        // Internal endpoint already validates X-Request-Source + X-Internal-Service-Token
        if (uri != null && uri.startsWith("/notifications/internal")) {
            return true;
        }

        if (uri != null && uri.startsWith("/notifications")) {
            if (!hasTrustedGatewayProvenance(request)) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Untrusted authentication provenance");
            }

            String userId = request.getHeader("X-User-Id");
            String rolesHeader = request.getHeader("X-User-Roles");
            String userEmail = request.getHeader("X-User-Email");

            if (userId == null || userId.isBlank() || rolesHeader == null || rolesHeader.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing auth headers");
            }

            Set<String> roles = Arrays.stream(rolesHeader.split(","))
                    .map(String::trim)
                    .filter(role -> !role.isBlank())
                    .collect(Collectors.toSet());

            UserContext.setCurrentUser(userId, userEmail, roles);
        }

        return true;
    }

    private boolean hasTrustedGatewayProvenance(HttpServletRequest request) {
        return request.getHeader("X-Forwarded-Host") != null
                && request.getHeader("X-Forwarded-Proto") != null
                && request.getHeader("X-Forwarded-Prefix") != null;
    }

    @Override
    public void afterCompletion(
            @NonNull HttpServletRequest request,
            @NonNull HttpServletResponse response,
            @NonNull Object handler,
            Exception ex
    ) {
        UserContext.clear();
    }
}
