package ma.eniad.justificationservice.client;

import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;

import java.util.List;

@FeignClient(name = "user-service", url = "${services.user-service.url:http://localhost:8082}", path = "/users")
public interface UserServiceClient {

    @GetMapping("/internal/admins/ids")
    List<Long> getAdminIds(@RequestHeader("X-Request-Source") String requestSource);
}
