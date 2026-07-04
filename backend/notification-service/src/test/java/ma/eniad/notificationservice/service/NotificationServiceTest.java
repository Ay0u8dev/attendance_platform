package ma.eniad.notificationservice.service;

import ma.eniad.notificationservice.dto.CreateNotificationRequest;
import ma.eniad.notificationservice.entity.Notification;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import ma.eniad.notificationservice.repository.NotificationRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class NotificationServiceTest {

    private NotificationRepository notificationRepository;
    private NotificationBroadcastService notificationBroadcastService;
    private NotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationRepository = mock(NotificationRepository.class);
        notificationBroadcastService = mock(NotificationBroadcastService.class);
        notificationService = new NotificationService(notificationRepository, notificationBroadcastService);
    }

    @Test
    void createNotificationAppliesDefaultSeverityFromType() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(new CreateNotificationRequest(
                10L,
                RecipientRole.STUDENT,
                NotificationType.JUSTIFICATION_APPROVED,
                null,
                "Approved",
                "Your justification was approved.",
                "JUSTIFICATION",
                "55",
                null
        ));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getSeverity()).isEqualTo(NotificationSeverity.SUCCESS);
    }

    @Test
    void attendanceStatusConfirmedDefaultsToSuccessSeverity() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(new CreateNotificationRequest(
                10L,
                RecipientRole.STUDENT,
                NotificationType.ATTENDANCE_STATUS_CONFIRMED,
                null,
                "Attendance confirmed",
                "Your presence was confirmed.",
                "ATTENDANCE_SESSION",
                "100",
                null
        ));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getSeverity()).isEqualTo(NotificationSeverity.SUCCESS);
    }

    @Test
    void justificationReviewRequestedDefaultsToInfoSeverity() {
        when(notificationRepository.save(any(Notification.class))).thenAnswer(invocation -> invocation.getArgument(0));

        notificationService.createNotification(new CreateNotificationRequest(
                77L,
                RecipientRole.TEACHER,
                NotificationType.JUSTIFICATION_REVIEW_REQUESTED,
                null,
                "New justification request",
                "A student submitted a justification.",
                "JUSTIFICATION",
                "55",
                null
        ));

        ArgumentCaptor<Notification> captor = ArgumentCaptor.forClass(Notification.class);
        verify(notificationRepository).save(captor.capture());
        assertThat(captor.getValue().getSeverity()).isEqualTo(NotificationSeverity.INFO);
        assertThat(captor.getValue().getRecipientRole()).isEqualTo(RecipientRole.TEACHER);
    }

    @Test
    void deleteNotificationSoftDeletesOnlyOwnNotification() {
        Notification notification = Notification.builder()
                .id(1L)
                .recipientUserId(10L)
                .recipientRole(RecipientRole.STUDENT)
                .type(NotificationType.SYSTEM_ALERT)
                .title("Alert")
                .message("Message")
                .build();
        when(notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(1L, 10L))
                .thenReturn(Optional.of(notification));

        notificationService.deleteNotification(1L, 10L);

        assertThat(notification.getDeletedAt()).isNotNull();
    }

    @Test
    void deleteNotificationReturnsNotFoundForAnotherUser() {
        when(notificationRepository.findByIdAndRecipientUserIdAndDeletedAtIsNull(1L, 99L))
                .thenReturn(Optional.empty());

        assertThatThrownBy(() -> notificationService.deleteNotification(1L, 99L))
                .isInstanceOf(ResponseStatusException.class);
    }
}
