package ma.eniad.authservice.services;

import io.jsonwebtoken.Claims;
import ma.eniad.authservice.dto.Role;
import ma.eniad.authservice.dto.UserDto;
import org.junit.jupiter.api.Test;

import java.lang.reflect.Field;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertThrows;

class JwtServiceTest {

    @Test
    void generatedTokenContainsFirstLoginClaim() throws Exception {
        JwtService jwtService = jwtService();
        UserDto user = UserDto.builder()
                .id(1L)
                .email("student@ump.ac.ma")
                .pfpUrl("https://cdn.example.com/student.jpg")
                .roles(List.of(Role.STUDENT))
                .enabled(true)
                .firstLogin(true)
                .build();

        Claims claims = jwtService.parseAndValidateAccessToken(jwtService.generateToken(user));

        assertEquals(Boolean.TRUE, claims.get("firstLogin", Boolean.class));
        assertEquals("https://cdn.example.com/student.jpg", claims.get("pfpUrl", String.class));
    }

    @Test
    void generatedTokenOmitsBlankProfilePhotoClaim() throws Exception {
        JwtService jwtService = jwtService();
        UserDto user = UserDto.builder()
                .id(1L)
                .email("student@ump.ac.ma")
                .pfpUrl("   ")
                .roles(List.of(Role.STUDENT))
                .enabled(true)
                .firstLogin(true)
                .build();

        Claims claims = jwtService.parseAndValidateAccessToken(jwtService.generateToken(user));

        assertNull(claims.get("pfpUrl", String.class));
    }

    @Test
    void rejectsLegacyStudentTokenWithoutFirstLoginClaim() throws Exception {
        JwtService jwtService = jwtService();
        Map<String, Object> claims = new HashMap<>();
        claims.put("id", 1L);
        claims.put("email", "student@ump.ac.ma");
        claims.put("roles", List.of(Role.STUDENT.name()));
        String token = jwtService.generateToken(claims, "student@ump.ac.ma");

        assertThrows(RuntimeException.class, () -> jwtService.parseAndValidateAccessToken(token));
    }

    private static JwtService jwtService() throws Exception {
        JwtService jwtService = new JwtService();
        setField(jwtService, "secretKey", "01234567890123456789012345678901");
        setField(jwtService, "jwtExpiration", 60_000L);
        setField(jwtService, "jwtIssuer", "auth-service");
        return jwtService;
    }

    private static void setField(Object target, String name, Object value) throws Exception {
        Field field = target.getClass().getDeclaredField(name);
        field.setAccessible(true);
        field.set(target, value);
    }
}
