package ma.eniad.notificationservice.repository;

import java.time.LocalDateTime;
import java.util.Optional;

import ma.eniad.notificationservice.entity.Notification;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface NotificationRepository extends JpaRepository<Notification, Long> {
    Page<Notification> findByRecipientUserIdAndDeletedAtIsNullOrderByCreatedAtDesc(
            Long recipientUserId,
            Pageable pageable
    );

    long countByRecipientUserIdAndReadAtIsNullAndDeletedAtIsNull(Long recipientUserId);

    Optional<Notification> findByIdAndRecipientUserIdAndDeletedAtIsNull(Long id, Long recipientUserId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification n
            set n.readAt = :readAt,
                n.updatedAt = :readAt
            where n.recipientUserId = :recipientUserId
              and n.readAt is null
              and n.deletedAt is null
            """)
    int markAllAsRead(Long recipientUserId, LocalDateTime readAt);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("""
            update Notification n
            set n.deletedAt = :deletedAt,
                n.updatedAt = :deletedAt
            where n.recipientUserId = :recipientUserId
              and n.readAt is not null
              and n.deletedAt is null
            """)
    int markReadAsDeleted(Long recipientUserId, LocalDateTime deletedAt);
}
