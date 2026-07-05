package ma.eniad.justificationservice.messaging;

import ma.eniad.justificationservice.dto.NotificationRequestedEvent;

public interface NotificationEventPublisher {

    void publish(NotificationRequestedEvent event);
}
