package ma.eniad.notificationservice.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.dto.CreateNotificationRequest;
import ma.eniad.notificationservice.dto.NotificationResponse;
import ma.eniad.notificationservice.security.InternalRequestValidator;
import ma.eniad.notificationservice.service.NotificationService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/notifications/internal")
@RequiredArgsConstructor
public class InternalNotificationController {

    private final InternalRequestValidator internalRequestValidator;
    private final NotificationService notificationService;

    @PostMapping
    public ResponseEntity<NotificationResponse> createNotification(
            @RequestHeader(name = "X-Request-Source", required = false) String requestSource,
            @RequestHeader(name = "X-Internal-Service-Token", required = false) String internalToken,
            @Valid @RequestBody CreateNotificationRequest request
    ) {
        internalRequestValidator.validate(requestSource, internalToken);
        NotificationResponse response = notificationService.createNotification(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
