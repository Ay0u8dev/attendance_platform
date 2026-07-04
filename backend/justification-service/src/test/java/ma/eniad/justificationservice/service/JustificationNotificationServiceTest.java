package ma.eniad.justificationservice.service;

import ma.eniad.justificationservice.dto.NotificationRequestedEvent;
import ma.eniad.justificationservice.entity.Justification;
import ma.eniad.justificationservice.entity.enums.NotificationChannel;
import ma.eniad.justificationservice.messaging.NotificationEventPublisher;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;

class JustificationNotificationServiceTest {

    private NotificationEventPublisher notificationEventPublisher;
    private JustificationNotificationService notificationService;

    @BeforeEach
    void setUp() {
        notificationEventPublisher = mock(NotificationEventPublisher.class);
        notificationService = new JustificationNotificationService(notificationEventPublisher);
    }

    @Test
    void notifySubmittedPublishesStudentEvent() {
        Justification justification = baseJustification();

        notificationService.notifySubmitted(justification);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher).publish(captor.capture());
        assertThat(captor.getValue().eventSource()).isEqualTo("justification-service");
        assertThat(captor.getValue().type()).isEqualTo("JUSTIFICATION_SUBMITTED");
        assertThat(captor.getValue().recipientUserId()).isEqualTo(6L);
        assertThat(captor.getValue().recipientRole()).isEqualTo("STUDENT");
        assertThat(captor.getValue().channels())
                .containsExactlyInAnyOrder(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL);
    }

    @Test
    void notifySubmittedForTeacherPublishesReviewRequest() {
        Justification justification = baseJustification();

        notificationService.notifySubmittedForTeacher(justification, 77L);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher).publish(captor.capture());
        assertThat(captor.getValue().type()).isEqualTo("JUSTIFICATION_REVIEW_REQUESTED");
        assertThat(captor.getValue().recipientUserId()).isEqualTo(77L);
        assertThat(captor.getValue().recipientRole()).isEqualTo("TEACHER");
    }

    @Test
    void publishFailureIsNonBlocking() {
        doThrow(new RuntimeException("rabbit down"))
                .when(notificationEventPublisher)
                .publish(any());

        assertThatNoException().isThrownBy(() -> notificationService.notifyRejected(baseJustification()));
    }

    @Test
    void notifyApprovedPublishesStudentEmailEvent() {
        Justification justification = baseJustification();

        notificationService.notifyApproved(justification);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher).publish(captor.capture());
        assertThat(captor.getValue().type()).isEqualTo("JUSTIFICATION_APPROVED");
        assertThat(captor.getValue().recipientEmail()).isEqualTo("mariam.fahim@ump.ac.ma");
        assertThat(captor.getValue().recipientName()).isEqualTo("Mariam Fahim");
        assertThat(captor.getValue().channels())
                .containsExactlyInAnyOrder(NotificationChannel.IN_APP, NotificationChannel.WEBSOCKET, NotificationChannel.EMAIL);
        assertThat(captor.getValue().metadataJson()).contains("\"status\":\"APPROVED\"");
    }

    @Test
    void notifyRejectedPublishesStudentEmailEvent() {
        Justification justification = baseJustification();
        justification.setStatus(ma.eniad.justificationservice.entity.enums.JustificationStatus.REJECTED);

        notificationService.notifyRejected(justification);

        ArgumentCaptor<NotificationRequestedEvent> captor = ArgumentCaptor.forClass(NotificationRequestedEvent.class);
        verify(notificationEventPublisher).publish(captor.capture());
        assertThat(captor.getValue().type()).isEqualTo("JUSTIFICATION_REJECTED");
        assertThat(captor.getValue().recipientEmail()).isEqualTo("mariam.fahim@ump.ac.ma");
        assertThat(captor.getValue().metadataJson()).contains("\"status\":\"REJECTED\"");
    }

    private Justification baseJustification() {
        return Justification.builder()
                .id(9L)
                .sessionId(10L)
                .studentId(6L)
                .studentName("Mariam Fahim")
                .studentEmail("mariam.fahim@ump.ac.ma")
                .module("Advanced Web Development")
                .status(ma.eniad.justificationservice.entity.enums.JustificationStatus.APPROVED)
                .build();
    }
}
