package ma.eniad.attendanceservice.config;

import ma.eniad.attendanceservice.entity.AttendanceSession;
import ma.eniad.attendanceservice.repository.AttendanceSessionRepository;
import ma.eniad.attendanceservice.service.AuthValidationService;
import ma.eniad.attendanceservice.service.AuthenticatedUserPrincipal;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessagingException;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.MessageBuilder;

import java.util.Optional;
import java.util.Set;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AttendanceWebSocketChannelInterceptorTest {

    private AuthValidationService authValidationService;
    private AttendanceSessionRepository attendanceSessionRepository;
    private AttendanceWebSocketChannelInterceptor interceptor;

    @BeforeEach
    void setUp() {
        authValidationService = mock(AuthValidationService.class);
        attendanceSessionRepository = mock(AttendanceSessionRepository.class);
        interceptor = new AttendanceWebSocketChannelInterceptor(authValidationService, attendanceSessionRepository);
    }

    @Test
    void connectAuthenticatesUser() {
        AuthenticatedUserPrincipal principal = new AuthenticatedUserPrincipal("77", "teacher@ump.ac.ma", Set.of("TEACHER"));
        when(authValidationService.validateBearerToken("Bearer token")).thenReturn(principal);

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.CONNECT);
        accessor.setNativeHeader("Authorization", "Bearer token");
        accessor.setLeaveMutable(true);

        Message<?> result = interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null);
        StompHeaderAccessor resultAccessor = StompHeaderAccessor.wrap(result);

        assertThat(resultAccessor.getUser()).isEqualTo(principal);
    }

    @Test
    void subscribeAllowsOwningTeacherAndAdminButRejectsStudent() {
        AttendanceSession session = AttendanceSession.builder().id(100L).teacherId(77L).build();
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(session));

        StompHeaderAccessor teacherAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        teacherAccessor.setDestination("/topic/attendance.sessions.100");
        teacherAccessor.setUser(new AuthenticatedUserPrincipal("77", "teacher@ump.ac.ma", Set.of("TEACHER")));
        teacherAccessor.setLeaveMutable(true);
        assertThat(interceptor.preSend(MessageBuilder.createMessage(new byte[0], teacherAccessor.getMessageHeaders()), null)).isNotNull();

        StompHeaderAccessor adminAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        adminAccessor.setDestination("/topic/attendance.sessions.100");
        adminAccessor.setUser(new AuthenticatedUserPrincipal("1", "admin@ump.ac.ma", Set.of("ADMIN")));
        adminAccessor.setLeaveMutable(true);
        assertThat(interceptor.preSend(MessageBuilder.createMessage(new byte[0], adminAccessor.getMessageHeaders()), null)).isNotNull();

        StompHeaderAccessor studentAccessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        studentAccessor.setDestination("/topic/attendance.sessions.100");
        studentAccessor.setUser(new AuthenticatedUserPrincipal("12", "student@ump.ac.ma", Set.of("STUDENT")));
        studentAccessor.setLeaveMutable(true);

        assertThatThrownBy(() -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], studentAccessor.getMessageHeaders()), null))
                .isInstanceOf(MessagingException.class);
    }

    @Test
    void subscribeRejectsOtherTeacher() {
        AttendanceSession session = AttendanceSession.builder().id(100L).teacherId(77L).build();
        when(attendanceSessionRepository.findById(100L)).thenReturn(Optional.of(session));

        StompHeaderAccessor accessor = StompHeaderAccessor.create(StompCommand.SUBSCRIBE);
        accessor.setDestination("/topic/attendance.sessions.100");
        accessor.setUser(new AuthenticatedUserPrincipal("88", "other@ump.ac.ma", Set.of("TEACHER")));
        accessor.setLeaveMutable(true);

        assertThatThrownBy(() -> interceptor.preSend(MessageBuilder.createMessage(new byte[0], accessor.getMessageHeaders()), null))
                .isInstanceOf(MessagingException.class);
    }
}
