package ma.eniad.notificationservice.config;

import ma.eniad.notificationservice.security.AuthenticatedUserPrincipal;
import ma.eniad.notificationservice.service.AuthValidationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class NotificationWebSocketChannelInterceptorTest {

    private AuthValidationService authValidationService;
    private NotificationWebSocketChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        authValidationService = mock(AuthValidationService.class);
        interceptor = new NotificationWebSocketChannelInterceptor(authValidationService);
    }

    @Test
    void connectAuthenticatesUser() {
        AuthenticatedUserPrincipal principal =
                new AuthenticatedUserPrincipal("10", "student@ump.ac.ma", Set.of("STUDENT"));
        when(authValidationService.validateBearerToken("Bearer token")).thenReturn(principal);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer token");
        accessor.setLeaveMutable(true);

        var result = interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()),
                null
        );
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);

        assertThat(resultAccessor.getUser()).isEqualTo(principal);
    }

    @Test
    void subscribeAllowsOnlyOwnUserTopic() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications.users.10");
        accessor.setUser(new AuthenticatedUserPrincipal("10", "student@ump.ac.ma", Set.of("STUDENT")));
        accessor.setLeaveMutable(true);

        assertThat(interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()),
                null
        )).isNotNull();
    }

    @Test
    void subscribeRejectsAnotherUserTopic() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications.users.11");
        accessor.setUser(new AuthenticatedUserPrincipal("10", "student@ump.ac.ma", Set.of("STUDENT")));
        accessor.setLeaveMutable(true);

        assertThatThrownBy(() -> interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()),
                null
        )).isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeRejectsUnexpectedDestination() {
        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/notifications.admins");
        accessor.setUser(new AuthenticatedUserPrincipal("10", "student@ump.ac.ma", Set.of("STUDENT")));
        accessor.setLeaveMutable(true);

        assertThatThrownBy(() -> interceptor.preSend(
                MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()),
                null
        )).isInstanceOf(MessagingException.class);
    }
}
