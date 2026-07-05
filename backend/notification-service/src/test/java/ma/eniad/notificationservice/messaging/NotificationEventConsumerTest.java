package ma.eniad.notificationservice.messaging;

import io.micrometer.core.instrument.simple.SimpleMeterRegistry;
import ma.eniad.notificationservice.dto.CreateNotificationRequest;
import ma.eniad.notificationservice.dto.NotificationRequestedEvent;
import ma.eniad.notificationservice.entity.enums.NotificationChannel;
import ma.eniad.notificationservice.entity.enums.NotificationSeverity;
import ma.eniad.notificationservice.entity.enums.NotificationType;
import ma.eniad.notificationservice.entity.enums.RecipientRole;
import ma.eniad.notificationservice.service.NotificationService;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.LocalDateTime;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;

class NotificationEventConsumerTest {

    private NotificationService notificationService;
    private NotificationEventHandler handler;

    @BeforeEach
    void setUp() {
        notificationService = mock(NotificationService.class);
        handler = new NotificationEventHandler(notificationService, new SimpleMeterRegistry());
    }

    @Test
    void handleCreatesNotificationFromValidEvent() {
        NotificationRequestedEvent event = new NotificationRequestedEvent(
                "evt-1",
                "attendance-service",
                NotificationType.ABSENCE_RECORDED,
                42L,
                RecipientRole.STUDENT,
                "student@example.test",
                "Student Name",
                "Absence recorded",
                "You were marked absent.",
                NotificationSeverity.WARNING,
                "ATTENDANCE_SESSION",
                "100",
                Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET),
                "{\"sessionId\":100}",
                LocalDateTime.now()
        );

        handler.handle(event);

        ArgumentCaptor<CreateNotificationRequest> captor = ArgumentCaptor.forClass(CreateNotificationRequest.class);
        verify(notificationService).createNotification(captor.capture());
        assertThat(captor.getValue().recipientUserId()).isEqualTo(42L);
        assertThat(captor.getValue().recipientEmail()).isEqualTo("student@example.test");
        assertThat(captor.getValue().recipientName()).isEqualTo("Student Name");
        assertThat(captor.getValue().recipientRole()).isEqualTo(RecipientRole.STUDENT);
        assertThat(captor.getValue().type()).isEqualTo(NotificationType.ABSENCE_RECORDED);
        assertThat(captor.getValue().severity()).isEqualTo(NotificationSeverity.WARNING);
        assertThat(captor.getValue().metadataJson()).contains("\"sessionId\":100");
    }

    @Test
    void handleIgnoresInvalidEvent() {
        NotificationRequestedEvent event = new NotificationRequestedEvent(
                null,
                "attendance-service",
                NotificationType.ABSENCE_RECORDED,
                42L,
                RecipientRole.STUDENT,
                null,
                null,
                "Absence recorded",
                "You were marked absent.",
                NotificationSeverity.WARNING,
                "ATTENDANCE_SESSION",
                "100",
                Set.of(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET),
                null,
                LocalDateTime.now()
        );

        handler.handle(event);

        verifyNoInteractions(notificationService);
    }
}
