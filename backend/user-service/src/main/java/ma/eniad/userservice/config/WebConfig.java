package ma.eniad.userservice.config;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.context.annotation.Configuration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
public class WebConfig implements WebMvcConfigurer {

    @Autowired
    private RoleCheckInterceptor roleCheckInterceptor;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(roleCheckInterceptor)
                .addPathPatterns("/users/**");       // Apply to all API routes
//                .excludePathPatterns("/users/public/**"); // Exclude public endpoints
    }

    @Override
    public void addCorsMappings(CorsRegistry registry) {
        registry.addMapping("/users/**")
            .allowedOrigins("http://localhost:4200", "http://localhost", "http://attendance-platform.ma", "http://192.168.100.73:18080",
                "https://yunoserver.tail8ea16a.ts.net", "https://yunoserver.tail8ea16a.ts.net/*",
                "http://attendance-yuno.duckdns.org",
                "https://attendance-yuno.duckdns.org")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "Accept",
                "X-User-Id", "X-User-Roles", "X-User-Email", "X-Request-Source")
            .allowCredentials(true)
            .maxAge(100);

        registry.addMapping("/api/users/**")
            .allowedOrigins("http://localhost:4200", "http://localhost", "http://attendance-platform.ma", "http://192.168.100.73:18080", "https://yunoserver.tail8ea16a.ts.net", "https://yunoserver.tail8ea16a.ts.net/*",
                "http://attendance-yuno.duckdns.org",
                "https://attendance-yuno.duckdns.org")
            .allowedMethods("GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS")
            .allowedHeaders("Authorization", "Content-Type", "Accept",
                "X-User-Id", "X-User-Roles", "X-User-Email", "X-Request-Source")
            .allowCredentials(true)
            .maxAge(100);
    }
}
