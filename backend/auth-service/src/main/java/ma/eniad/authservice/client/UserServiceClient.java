package ma.eniad.authservice.client;

import ma.eniad.authservice.dto.UserDto;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

import java.util.Map;

@FeignClient(name = "user-service", url = "${services.user-service.url:http://localhost:8082}", path = "/users")
public interface UserServiceClient {

    @PostMapping("auth-user")
    UserDto authUser(
            @RequestBody Map<String, String> userData
    );
}
