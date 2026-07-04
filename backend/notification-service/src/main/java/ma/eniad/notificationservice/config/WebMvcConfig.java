package ma.eniad.notificationservice.config;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.security.AuthHeaderInterceptor;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class WebMvcConfig implements WebMvcConfigurer {

    private final AuthHeaderInterceptor authHeaderInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(authHeaderInterceptor)
                .addPathPatterns("/notifications/**")
                .excludePathPatterns("/notifications/ws/**");
    }
}
