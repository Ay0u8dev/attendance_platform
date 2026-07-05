package ma.eniad.notificationservice.repository;

import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.ActiveProfiles;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DataJpaTest
@ActiveProfiles("test")
class NotificationRepositoryTest {

    @Autowired
    private NotificationRepository notificationRepository;

    @Test
    void shouldCreateAndFindNotificationByRecipient() {
        Notification notification = Notification.builder()
                .recipientUserId(10L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.ATTENDANCE_SESSION_STARTED)
                .title("Nouvelle séance")
                .message("Une nouvelle séance de présence a commencé.")
                .relatedEntityType("ATTENDANCE_SESSION")
                .relatedEntityId("55")
                .build();

        notificationRepository.save(notification);

        var page = notificationRepository.findByRecipientUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                10L,
                PageRequest.of(0, 10)
        );

        assertThat(page.getTotalElements()).isEqualTo(1);
        assertThat(page.getContent().getFirst().getRecipientUserId()).isEqualTo(10L);
        assertThat(page.getContent().getFirst().getReadAt()).isNull();
        assertThat(page.getContent().getFirst().getCreatedAt()).isNotNull();
    }

    @Test
    void shouldCountUnreadNotifications() {
        Notification unread = Notification.builder()
                .recipientUserId(20L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Alert")
                .message("Unread message")
                .build();

        Notification anotherUser = Notification.builder()
                .recipientUserId(30L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Alert")
                .message("Other user message")
                .build();

        notificationRepository.save(unread);
        notificationRepository.save(anotherUser);

        long count = notificationRepository.countByRecipientUserIdAndReadAtIsNullAndDeletedAtIsNull(20L);

        assertThat(count).isEqualTo(1);
    }

    @Test
    void shouldFindOnlyOwnNotification() {
        Notification notification = Notification.builder()
                .recipientUserId(40L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Private")
                .message("Only recipient can access this.")
                .build();

        Notification saved = notificationRepository.save(notification);

        Optional<Notification> foundForOwner =
                notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(saved.getId(), 40L);

        Optional<Notification> foundForOtherUser =
                notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(saved.getId(), 41L);

        assertThat(foundForOwner).isPresent();
        assertThat(foundForOtherUser).isEmpty();
    }

    @Test
    void shouldExcludeDeletedNotificationsFromListAndUnreadCount() {
        Notification deleted = Notification.builder()
                .recipientUserId(50L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Deleted")
                .message("Deleted message")
                .build();
        deleted.markAsDeleted();

        Notification visible = Notification.builder()
                .recipientUserId(50L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Visible")
                .message("Visible message")
                .build();

        notificationRepository.save(deleted);
        notificationRepository.save(visible);

        var page = notificationRepository.findByRecipientUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                50L,
                PageRequest.of(0, 10)
        );
        long unreadCount = notificationRepository.countByRecipientUserIdAndReadAtIsNullAndDeletedAtIsNull(50L);

        assertThat(page.getContent()).extracting(Notification::getTitle).containsExactly("Visible");
        assertThat(unreadCount).isEqualTo(1);
    }

    @Test
    void shouldDeleteOnlyReadNotificationsForRecipient() {
        Notification read = Notification.builder()
                .recipientUserId(60L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Read")
                .message("Read message")
                .build();
        read.markAsRead();

        Notification unread = Notification.builder()
                .recipientUserId(60L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Unread")
                .message("Unread message")
                .build();

        Notification otherUserRead = Notification.builder()
                .recipientUserId(61L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Other")
                .message("Other message")
                .build();
        otherUserRead.markAsRead();

        notificationRepository.save(read);
        notificationRepository.save(unread);
        notificationRepository.save(otherUserRead);

        int deletedCount = notificationRepository.markReadAsDeleted(60L, java.time.LocalDateTime.now());

        assertThat(deletedCount).isEqualTo(1);
        var page = notificationRepository.findByRecipientUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
                60L,
                PageRequest.of(0, 10)
        );
        assertThat(page.getContent()).extracting(Notification::getTitle).containsExactly("Unread");
    }
}
