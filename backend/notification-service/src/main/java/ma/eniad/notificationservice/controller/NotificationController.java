package ma.eniad.notificationservice.controller;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.dto.DeleteNotificationsResponse;
import ma.eniad.notificationservice.dto.NotificationResponse;
import ma.eniad.notificationservice.dto.PagedResponse;
import ma.eniad.notificationservice.dto.ReadAllNotificationsResponse;
import ma.eniad.notificationservice.dto.UnreadCountResponse;
import ma.eniad.notificationservice.security.UserContext;
import ma.eniad.notificationservice.service.NotificationService;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/notifications")
@RequiredArgsConstructor
public class NotificationController {

    private final NotificationService notificationService;

    @GetMapping("/me")
    public ResponseEntity<PagedResponse<NotificationResponse>> getMyNotifications(
            @PageableDefault(size = 10) Pageable pageable
    ) {
        Long userId = currentUserId();
        return ResponseEntity.ok(notificationService.getUserNotifications(userId, pageable));
    }

    @GetMapping("/unread-count")
    public ResponseEntity<UnreadCountResponse> getUnreadCount() {
        Long userId = currentUserId();
        return ResponseEntity.ok(new UnreadCountResponse(notificationService.countUnread(userId)));
    }

    @PatchMapping("/{notificationId:\\d+}/read")
    public ResponseEntity<NotificationResponse> markAsRead(@PathVariable Long notificationId) {
        Long userId = currentUserId();
        return ResponseEntity.ok(notificationService.markAsRead(notificationId, userId));
    }

    @PatchMapping("/read-all")
    public ResponseEntity<ReadAllNotificationsResponse> markAllAsRead() {
        Long userId = currentUserId();
        int updatedCount = notificationService.markAllAsRead(userId);
        return ResponseEntity.ok(new ReadAllNotificationsResponse(updatedCount));
    }

    @DeleteMapping("/{notificationId:\\d+}")
    public ResponseEntity<Void> deleteNotification(@PathVariable Long notificationId) {
        Long userId = currentUserId();
        notificationService.deleteNotification(notificationId, userId);
        return ResponseEntity.noContent().build();
    }

    @DeleteMapping("/read")
    public ResponseEntity<DeleteNotificationsResponse> deleteReadNotifications() {
        Long userId = currentUserId();
        int deletedCount = notificationService.deleteReadNotifications(userId);
        return ResponseEntity.ok(new DeleteNotificationsResponse(deletedCount));
    }

    private Long currentUserId() {
        UserContext.UserInfo user = UserContext.getCurrentUser();

        if (user == null || user.userId() == null || user.userId().isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing authenticated user");
        }

        try {
            return Long.valueOf(user.userId());
        } catch (NumberFormatException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid authenticated user id");
        }
    }
}
