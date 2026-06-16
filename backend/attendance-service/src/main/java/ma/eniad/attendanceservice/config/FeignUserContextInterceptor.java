package ma.eniad.attendanceservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import ma.eniad.attendanceservice.service.UserContext;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class FeignUserContextInterceptor implements RequestInterceptor {

    private final String applicationName;

    public FeignUserContextInterceptor(@Value("${spring.application.name:unknown-service}") String applicationName) {
        this.applicationName = applicationName;
    }

    @Override
    public void apply(RequestTemplate template) {
        template.header("X-Request-Source", applicationName);

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
