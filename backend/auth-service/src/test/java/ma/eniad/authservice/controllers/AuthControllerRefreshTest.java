package ma.eniad.authservice.controllers;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.Jwts;
import ma.eniad.authservice.client.UserServiceClient;
import ma.eniad.authservice.dto.Role;
import ma.eniad.authservice.dto.UserDto;
import ma.eniad.authservice.services.GoogleTokenService;
import ma.eniad.authservice.services.JwtService;
import org.junit.jupiter.api.Test;
import org.springframework.http.ResponseEntity;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthControllerRefreshTest {

    private final UserServiceClient userServiceClient = mock(UserServiceClient.class);
    private final JwtService jwtService = mock(JwtService.class);
    private final AuthController controller = new AuthController(
            userServiceClient,
            jwtService,
            mock(GoogleTokenService.class)
    );

    @Test
    void reissuesTokenFromFreshUserState() {
        Claims claims = Jwts.claims();
        claims.put("email", "student@ump.ac.ma");
        UserDto enrolledStudent = UserDto.builder()
                .id(12L)
                .email("student@ump.ac.ma")
                .roles(List.of(Role.STUDENT))
                .enabled(true)
                .firstLogin(false)
                .build();

        when(jwtService.parseAndValidateAccessToken("old-token")).thenReturn(claims);
        when(jwtService.extractUserId(claims)).thenReturn("12");
        when(userServiceClient.findById(12L)).thenReturn(enrolledStudent);
        when(jwtService.generateToken(enrolledStudent)).thenReturn("new-token");

        ResponseEntity<?> response = controller.refreshAccessToken("Bearer old-token");

        assertEquals(Map.of("accessToken", "new-token"), response.getBody());
        verify(jwtService).generateToken(enrolledStudent);
    }

    @Test
    void rejectsRefreshWhenFreshUserDoesNotMatchTokenIdentity() {
        Claims claims = Jwts.claims();
        claims.put("email", "student@ump.ac.ma");
        UserDto anotherUser = UserDto.builder()
                .id(12L)
                .email("other@ump.ac.ma")
                .roles(List.of(Role.STUDENT))
                .enabled(true)
                .firstLogin(false)
                .build();

        when(jwtService.parseAndValidateAccessToken("old-token")).thenReturn(claims);
        when(jwtService.extractUserId(claims)).thenReturn("12");
        when(userServiceClient.findById(12L)).thenReturn(anotherUser);

        assertThrows(
                ResponseStatusException.class,
                () -> controller.refreshAccessToken("Bearer old-token")
        );
    }
}
