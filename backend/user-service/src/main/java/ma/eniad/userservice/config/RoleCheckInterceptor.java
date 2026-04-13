package ma.eniad.userservice.config;

import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import ma.eniad.userservice.annotation.RequireRole;
import ma.eniad.userservice.service.UserContext;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Component
public class RoleCheckInterceptor implements HandlerInterceptor {

    @Override
    public boolean preHandle(HttpServletRequest request,
                             HttpServletResponse response,
                             Object handler) throws Exception {

        // 1. Extract headers and set user context
        String userId = request.getHeader("X-User-Id");
        String rolesHeader = request.getHeader("X-User-Roles");
        String userEmail = request.getHeader("X-User-Email");

        if (userId == null || rolesHeader == null) {
            response.sendError(HttpServletResponse.SC_UNAUTHORIZED, "Missing auth headers");
            return false;
        }

        Set<String> roles = Arrays.stream(rolesHeader.split(","))
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
                    response.sendError(HttpServletResponse.SC_FORBIDDEN,
                            "Insufficient roles. Required: " + Arrays.toString(requiredRoles));
                    return false; // ❌ Block the request
                }
            }
        }

        return true; // ✅ Allow the request to proceed
    }

    @Override
    public void afterCompletion(HttpServletRequest request,
                                HttpServletResponse response,
                                Object handler, Exception ex) {
        UserContext.clear(); // Clean up ThreadLocal
    }
}