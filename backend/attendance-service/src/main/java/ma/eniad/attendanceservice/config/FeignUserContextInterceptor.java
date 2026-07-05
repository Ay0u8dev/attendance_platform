package ma.eniad.attendanceservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeignUserContextInterceptor implements RequestInterceptor {

    private final String applicationName;
    private final String internalServiceToken;

    public FeignUserContextInterceptor(
            @Value("${spring.application.name:unknown-service}") String applicationName,
            @Value("${attendance.internal.service-token:}") String internalServiceToken) {
        this.applicationName = applicationName;
        this.internalServiceToken = internalServiceToken;
    }

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Request-Source", applicationName);

        if (internalServiceToken != null && !internalServiceToken.isBlank()) {
            template.header("X-Internal-Service-Token", internalServiceToken);
        }

        UserContext.UserInfo user = UserContext.getCurrentUser();
        if (user == null || user.userId() == null) {
            return;
        }

        template.header("X-User-Id", user.userId());

        if (user.userEmail() != null) {
            template.header("X-User-Email", user.userEmail());
        }

        if (user.roles() != null && !user.roles().isEmpty()) {
            template.header("X-User-Roles", String.join(",", user.roles()));
        }
    }
}
