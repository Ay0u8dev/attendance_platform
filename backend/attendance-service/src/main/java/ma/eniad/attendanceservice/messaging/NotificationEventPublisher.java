package ma.eniad.attendanceservice.messaging;

import ma.eniad.attendanceservice.dto.NotificationRequestedEvent;

public interface NotificationEventPublisher {

    void publish(NotificationRequestedEvent event);
}
