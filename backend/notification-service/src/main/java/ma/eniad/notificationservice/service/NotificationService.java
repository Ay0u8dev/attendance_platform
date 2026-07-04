package ma.eniad.notificationservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.dto.CreateNotificationRequest;
import ma.eniad.notificationservice.dto.NotificationResponse;
import ma.eniad.notificationservice.dto.PagedResponse;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.repository.NotificationRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;

@Service
@RequiredArgsConstructor
public class NotificationService {

    private final NotificationRepository notificationRepository;
    private final NotificationBroadcastService notificationBroadcastService;
    private final ObjectMapper objectMapper = new ObjectMapper();

    @Transactional
    public NotificationResponse createNotification(CreateNotificationRequest request) {
        Notification notification = Notification.builder()
                .recipientUserId(request.recipientUserId())
                .recipientRole(request.recipientRole())
                .type(request.type())
                .severity(resolveSeverity(request.type(), request.severity(), request.metadataJson()))
                .title(request.title().trim())
                .message(request.message().trim())
                .relatedEntityType(trimOrNull(request.relatedEntityType()))
                .relatedEntityId(trimOrNull(request.relatedEntityId()))
                .metadataJson(trimOrNull(request.metadataJson()))
                .build();

        Notification saved = notificationRepository.save(notification);
        NotificationResponse response = toResponse(saved);
        broadcastAfterCommit(saved.getRecipientUserId(), response);
        return response;
    }

    @Transactional(readOnly = true)
    public PagedResponse<NotificationResponse> getUserNotifications(Long userId, Pageable pageable) {
        Page<NotificationResponse> page = notificationRepository
                .findByRecipientUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(userId, pageable)
                .map(this::toResponse);

        return new PagedResponse<>(
                page.getContent(),
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isFirst(),
                page.isLast()
        );
    }

    @Transactional(readOnly = true)
    public long countUnread(Long userId) {
        return notificationRepository.countByRecipientUserIdAndReadAtIsNullAndDeletedAtIsNull(userId);
    }

    @Transactional
    public NotificationResponse markAsRead(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        notification.markAsRead();

        return toResponse(notification);
    }

    @Transactional
    public int markAllAsRead(Long userId) {
        return notificationRepository.markAllAsRead(userId, LocalDateTime.now());
    }

    @Transactional
    public void deleteNotification(Long notificationId, Long userId) {
        Notification notification = notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(notificationId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Notification not found"));

        notification.markAsDeleted();
    }

    @Transactional
    public int deleteReadNotifications(Long userId) {
        return notificationRepository.markReadAsDeleted(userId, LocalDateTime.now());
    }

    private NotificationResponse toResponse(Notification notification) {
        return new NotificationResponse(
                notification.getId(),
                notification.getRecipientUserId(),
                notification.getRecipientRole(),
                notification.getType(),
                resolveSeverity(notification.getType(), notification.getSeverity(), notification.getMetadataJson()),
                notification.getTitle(),
                notification.getMessage(),
                notification.getRelatedEntityType(),
                notification.getRelatedEntityId(),
                notification.getMetadataJson(),
                notification.getReadAt(),
                notification.getCreatedAt(),
                notification.isRead()
        );
    }

    private String trimOrNull(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim();
    }

    private void broadcastAfterCommit(Long recipientUserId, NotificationResponse response) {
        if (!TransactionSynchronizationManager.isSynchronizationActive()) {
            notificationBroadcastService.broadcastToUser(recipientUserId, response);
            return;
        }

        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCommit() {
                notificationBroadcastService.broadcastToUser(recipientUserId, response);
            }
        });
    }

    private NotificationSeverity resolveSeverity(
            NotificationType type,
            NotificationSeverity requestedSeverity,
            String metadataJson
    ) {
        if (requestedSeverity != null) {
            return requestedSeverity;
        }

        if (type == NotificationType.ATTENDANCE_STATUS_UPDATED && metadataJson != null) {
            try {
                JsonNode node = objectMapper.readTree(metadataJson);
                String status = node.path("status").asText(null);
                if ("PRESENT".equals(status)) {
                    return NotificationSeverity.SUCCESS;
                }
                if ("ABSENT".equals(status)) {
                    return NotificationSeverity.WARNING;
                }
            } catch (JsonProcessingException ignored) {
                // fall through to default resolution
            }
        }

        switch (type) {
            case ATTENDANCE_STATUS_CONFIRMED:
            case ATTENDANCE_SESSION_FINALIZED:
            case JUSTIFICATION_APPROVED:
                return NotificationSeverity.SUCCESS;
            case ABSENCE_RECORDED:
                return NotificationSeverity.WARNING;
            case JUSTIFICATION_REJECTED:
                return NotificationSeverity.DANGER;
            case SYSTEM_ALERT:
                return NotificationSeverity.NEUTRAL;
            default:
                return NotificationSeverity.INFO;
        }
    }
}
