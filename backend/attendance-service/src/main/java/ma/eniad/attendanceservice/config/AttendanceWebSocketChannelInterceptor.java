package ma.eniad.attendanceservice.config;

import lombok.RequiredArgsConstructor;
import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import ma.eniad.attendanceservice.service.AuthValidationService;
import ma.eniad.attendanceservice.service.AuthenticatedUserPrincipal;
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
public class AttendanceWebSocketChannelInterceptor implements ChannelInterceptor {

    private static final String AUTH_USER_ATTRIBUTE = "attendance.authenticated-user";
    private static final Pattern SESSION_TOPIC_PATTERN = Pattern.compile("^/topic/attendance\\.sessions\\.(\\d+)$");

    private final AuthValidationService authValidationService;
    private final AttendanceSessionRepository attendanceSessionRepository;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor == null || accessor.getCommand() == null) {
            return message;
        }

        if (StompCommand.CONNECT.equals(accessor.getCommand())) {
            AuthenticatedUserPrincipal user = authValidationService.validateBearerToken(accessor.getFirstNativeHeader("Authorization"));
            accessor.setUser(user);
            if (accessor.getSessionAttributes() != null) {
                accessor.getSessionAttributes().put(AUTH_USER_ATTRIBUTE, user);
            }
            return message;
        }

        if (StompCommand.SUBSCRIBE.equals(accessor.getCommand())) {
            AuthenticatedUserPrincipal user = resolveUser(accessor);
            String destination = accessor.getDestination();
            Matcher matcher = destination == null ? null : SESSION_TOPIC_PATTERN.matcher(destination);
            if (matcher == null || !matcher.matches()) {
                throw new MessagingException("Unauthorized websocket destination");
            }

            Long sessionId = Long.valueOf(matcher.group(1));
            if (user.hasRole("ADMIN")) {
                return message;
            }

            if (!user.hasRole("TEACHER")) {
                throw new MessagingException("Unauthorized websocket subscription");
            }

            AttendanceSession session = attendanceSessionRepository.findById(sessionId)
                    .orElseThrow(() -> new MessagingException("Session not found"));
            Long teacherId = session.getTeacherId();
            if (teacherId == null || !teacherId.toString().equals(user.userId())) {
                throw new MessagingException("Unauthorized websocket subscription");
            }        }

        return message;
    }

    private AuthenticatedUserPrincipal resolveUser(StompHeaderAccessor accessor) {
        if (accessor.getUser() instanceof AuthenticatedUserPrincipal user) {
            return user;
        }
        Object sessionUser = accessor.getSessionAttributes() == null ? null : accessor.getSessionAttributes().get(AUTH_USER_ATTRIBUTE);
        if (sessionUser instanceof AuthenticatedUserPrincipal user) {
            accessor.setUser(user);
            return user;
        }
        throw new MessagingException("Unauthenticated websocket session");
    }
}
