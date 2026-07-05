package ma.eniad.notificationservice.service;

import ma.eniad.notificationservice.security.AuthenticatedUserPrincipal;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestClientResponseException;
import org.springframework.web.server.ResponseStatusException;

import java.time.Duration;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthValidationService {

    private final RestClient restClient;

    public AuthValidationService(
            @Value("${services.auth.url:http://localhost:8081}") String authServiceUrl
    ) {
        SimpleClientHttpRequestFactory requestFactory = new SimpleClientHttpRequestFactory();
        requestFactory.setConnectTimeout((int) Duration.ofSeconds(5).toMillis());
        requestFactory.setReadTimeout((int) Duration.ofSeconds(5).toMillis());

        this.restClient = RestClient.builder()
                .baseUrl(authServiceUrl)
            .requestFactory(requestFactory)
                .build();
    }

    public AuthenticatedUserPrincipal validateBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing websocket Authorization header");
        }

        try {
            ResponseEntity<Void> response = restClient.get()
                    .uri("/auth/validate")
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .retrieve()
                    .toBodilessEntity();

            String userId = response.getHeaders().getFirst("X-User-Id");
            String rolesHeader = response.getHeaders().getFirst("X-User-Roles");
            String email = response.getHeaders().getFirst("X-User-Email");

            if (userId == null || userId.isBlank() || rolesHeader == null || rolesHeader.isBlank()) {
                throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Auth service did not return user headers");
            }

            Set<String> roles = Arrays.stream(rolesHeader.split(","))
                    .map(role -> role == null ? "" : role.trim())
                    .filter(role -> !role.isBlank())
                    .collect(Collectors.toSet());

            return new AuthenticatedUserPrincipal(userId, email, roles);

        } catch (RestClientResponseException ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid websocket token", ex);
        } catch (RestClientException ex) {
            throw new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE, "Auth service unavailable", ex);
        }
    }
}
