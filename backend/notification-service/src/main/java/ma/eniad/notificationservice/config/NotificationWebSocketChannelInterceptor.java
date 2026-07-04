package ma.eniad.notificationservice.config;

import lombok.RequiredArgsConstructor;
import ma.eniad.notificationservice.security.AuthenticatedUserPrincipal;
import ma.eniad.notificationservice.service.AuthValidationService;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.stereotype.Component;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
@RequiredArgsConstructor
public class NotificationWebSocketChannelInterceptor implements ChannelInterceptor {

    private static final String AUTH_USER_ATTRIBUTE = "notifications.authenticated-user";
    private static final Pattern USER_TOPIC_PATTERN =
            Pattern.compile("^/topic/notifications\\.users\\.(\\d+)$");

    private final AuthValidationService authValidationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);

        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            AuthenticatedUserPrincipal user =
                    authValidationService.validateBearerToken(accessor.getFirstNativeHeader("Authorization"));

            accessor.setUser(user);

            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put(AUTH_USER_ATTRIBUTE, user);
            }

            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            AuthenticatedUserPrincipal user = resolveUser(accessor);
            String destination = accessor.getDestination();

            Matcher matcher = destination == null ? null : USER_TOPIC_PATTERN.matcher(destination);

            if (matcher == null || !matcher.matches()) {
                throw new MessagingException("Unauthorized websocket destination");
            }

            String topicUserId = matcher.group(1);

            if (user.hasRole("ADMIN")) {
                return message;
            }

            if (!topicUserId.equals(user.userId())) {
                throw new MessagingException("Users can only subscribe to their own notification topic");
            }
        }

        return message;
    }

    private AuthenticatedUserPrincipal resolveUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof AuthenticatedUserPrincipal user) {
            return user;
        }

        Object sessionUser = accessor.getSessionAttributes() == null
                ? null
                : accessor.getSessionAttributes().get(AUTH_USER_ATTRIBUTE);

        if (sessionUser instanceof AuthenticatedUserPrincipal user) {
            accessor.setUser(user);
            return user;
        }

        throw new MessagingException("Unauthenticated websocket session");
    }
}
