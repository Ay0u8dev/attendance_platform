package ma.eniad.attendanceservice.client;

import ma.eniad.attendanceservice.dto.CreateNotificationRequest;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;

@FeignClient(
        name = "notification-service",
        url = "${services.notification.url:http://localhost:8086}",
        path = "/notifications"
)
public interface NotificationServiceClient {

    @PostMapping("/internal")
    void createNotification(@RequestBody CreateNotificationRequest request);
}
