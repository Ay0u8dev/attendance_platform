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

        if (user != null && user.getUserId() != null) {
            template.header("X-User-Id", user.getUserId());

            if (user.getUserEmail() != null) {
                template.header("X-User-Email", user.getUserEmail());
            }

            if (user.getRoles() != null && !user.getRoles().isEmpty()) {
                String roles = String.join(",", user.getRoles());
                template.header("X-User-Roles", roles);
            }
        }
    }
}
