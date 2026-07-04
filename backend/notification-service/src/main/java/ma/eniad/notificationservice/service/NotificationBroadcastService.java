package ma.eniad.notificationservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.dto.NotificationResponse;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationBroadcastService {

    private final SimpMessagingTemplate messagingTemplate;

    public void broadcastToUser(Long recipientUserId, NotificationResponse notification) {
        messagingTemplate.convertAndSend(
                "/topic/notifications.users." + recipientUserId,
                notification
        );
    }
}