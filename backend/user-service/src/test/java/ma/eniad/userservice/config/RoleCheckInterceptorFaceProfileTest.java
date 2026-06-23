package ma.eniad.userservice.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.server.ResponseStatusException;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class RoleCheckInterceptorFaceProfileTest {
    private RoleCheckInterceptor interceptor;

    @BeforeEach
    void setUp() {
        interceptor = new RoleCheckInterceptor();
        ReflectionTestUtils.setField(interceptor, "faceServiceToken", "test-service-token");
    }

    @Test
    void acceptsConfiguredFaceServiceCredential() throws Exception {
        MockHttpServletRequest request = request("test-service-token");

        assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    void acceptsConfiguredFaceServiceCredentialForProfileRead() throws Exception {
        MockHttpServletRequest request = request("GET", "test-service-token");

        assertThat(interceptor.preHandle(request, new MockHttpServletResponse(), new Object())).isTrue();
    }

    @Test
    void rejectsIncorrectCredentialForProfileRead() {
        MockHttpServletRequest request = request("GET", "wrong-token");

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsMissingInternalCredential() {
        MockHttpServletRequest request = request(null);

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsIncorrectInternalCredential() {
        MockHttpServletRequest request = request("wrong-token");

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsLegacyTrustedSourceOnFaceProfileEndpoint() {
        MockHttpServletRequest request = request("test-service-token");
        request.removeHeader("X-Request-Source");
        request.addHeader("X-Request-Source", "attendance-service");

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsForgedUserHeadersWithoutFaceServiceCredential() {
        MockHttpServletRequest request = new MockHttpServletRequest(
                "GET",
                "/users/internal/students/12/face-profile"
        );
        request.addHeader("X-User-Id", "12");
        request.addHeader("X-User-Roles", "STUDENT");
        request.addHeader("X-User-Email", "student@ump.ac.ma");

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.UNAUTHORIZED);
    }

    @Test
    void rejectsFaceProfileEndpointWhenFaceServiceTokenIsNotConfigured() {
        ReflectionTestUtils.setField(interceptor, "faceServiceToken", "");
        MockHttpServletRequest request = request("test-service-token");

        assertThatThrownBy(() -> interceptor.preHandle(request, new MockHttpServletResponse(), new Object()))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(exception -> ((ResponseStatusException) exception).getStatusCode())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
    }

    private MockHttpServletRequest request(String token) {
        return request("PUT", token);
    }

    private MockHttpServletRequest request(String method, String token) {
        MockHttpServletRequest request = new MockHttpServletRequest(
                method,
                "/users/internal/students/12/face-profile"
        );
        request.addHeader("X-Request-Source", "face-service");
        if (token != null) {
            request.addHeader("X-Internal-Service-Token", token);
        }
        return request;
    }
}
