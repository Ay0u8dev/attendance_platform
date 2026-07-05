package ma.eniad.notificationservice.messaging;

import io.micrometer.core.instrument.MeterRegistry;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.notificationservice.dto.CreateNotificationRequest;
import ma.eniad.notificationservice.dto.NotificationRequestedEvent;
import ma.eniad.notificationservice.entity.enums.NotificationChannel;
import ma.eniad.notificationservice.service.NotificationService;
import org.springframework.stereotype.Service;

import java.util.Set;

@Service
@RequiredArgsConstructor
@Slf4j
public class NotificationEventHandler {

    private final NotificationService notificationService;
    private final MeterRegistry meterRegistry;

    public void handle(NotificationRequestedEvent event) {
        if (!isValid(event)) {
            increment("invalid");
            log.warn(
                    "Ignoring invalid notification event eventId={} eventSource={} type={} recipientUserId={}",
                    event == null ? null : event.eventId(),
                    event == null ? null : event.eventSource(),
                    event == null ? null : event.type(),
                    event == null ? null : event.recipientUserId()
            );
            return;
        }

        Set<NotificationChannel> channels = event.channels();
        if (channels != null && !channels.isEmpty() && !channels.contains(NotificationChannel.IN_APP)) {
            increment("ignored_no_in_app_channel");
            log.info(
                    "Ignoring notification event without IN_APP channel eventId={} eventSource={} type={} recipientUserId={}",
                    event.eventId(),
                    event.eventSource(),
                    event.type(),
                    event.recipientUserId()
            );
            return;
        }

        notificationService.createNotification(new CreateNotificationRequest(
                event.recipientUserId(),
                event.recipientEmail(),
                event.recipientName(),
                event.recipientRole(),
                event.type(),
                event.severity(),
                event.title(),
                event.message(),
                event.relatedEntityType(),
                event.relatedEntityId(),
                event.metadataJson()
        ));
        increment("created");
    }

    private void increment(String outcome) {
        meterRegistry.counter(
                "notification_events_consumed_total",
                "outcome", outcome
        ).increment();
    }

    private boolean isValid(NotificationRequestedEvent event) {
        return event != null
                && hasText(event.eventId())
                && event.type() != null
                && event.recipientUserId() != null
                && event.recipientRole() != null
                && hasText(event.title())
                && hasText(event.message());
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }
}
