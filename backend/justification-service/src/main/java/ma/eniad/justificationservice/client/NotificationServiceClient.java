package ma.eniad.justificationservice.client;

import ma.eniad.justificationservice.dto.CreateNotificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;

@FeignClient(
        name = "notification-service",
        url = "${services.notification-service.url:http://localhost:8086}",
        path = "/notifications"
)
public interface NotificationServiceClient {

    @PostMapping("/internal")
    void createNotification(
            @RequestHeader("X-Request-Source") String requestSource,
            @RequestBody CreateNotificationRequest request
    );
}
