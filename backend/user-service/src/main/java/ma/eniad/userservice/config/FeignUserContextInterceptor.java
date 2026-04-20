package ma.eniad.userservice.config;

import feign.RequestInterceptor;
import feign.RequestTemplate;
import ma.eniad.userservice.service.UserContext;
import org.springframework.stereotype.Component;

@Component
public class FeignUserContextInterceptor implements RequestInterceptor {

    @Override
    public void apply(RequestTemplate template) {
        UserContext.UserInfo user = UserContext.getCurrentUser();

        if (user != null && user.userId() != null) {
            template.header("X-User-Id", user.userId());

            if (user.userEmail() != null) {
                template.header("X-User-Email", user.userEmail());
            }

            if (user.roles() != null && !user.roles().isEmpty()) {
                String roles = String.join(",", user.roles());
                template.header("X-User-Roles", roles);
            }
        }
    }
}