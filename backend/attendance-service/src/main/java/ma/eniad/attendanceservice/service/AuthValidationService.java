package ma.eniad.attendanceservice.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatusCode;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;
import org.springframework.web.client.RestClientException;
import org.springframework.web.server.ResponseStatusException;

import java.util.Arrays;
import java.util.Set;
import java.util.stream.Collectors;

@Service
public class AuthValidationService {

    private final RestClient restClient;

    public AuthValidationService(RestClient.Builder restClientBuilder,
                                 @Value("${services.auth-service.url:http://localhost:8081}") String authServiceUrl) {
        this.restClient = restClientBuilder
                .baseUrl(authServiceUrl)
                .build();
    }

    public AuthenticatedUserPrincipal validateBearerToken(String authorizationHeader) {
        if (authorizationHeader == null || authorizationHeader.isBlank() || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Missing Authorization header");
        }

        try {
            return restClient.get()
                    .uri("/auth/validate")
                    .header(HttpHeaders.AUTHORIZATION, authorizationHeader)
                    .exchange((request, response) -> {
                        HttpStatusCode status = response.getStatusCode();
                        if (status.isError()) {
                            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Invalid websocket token");
                        }

                        String userId = response.getHeaders().getFirst("X-User-Id");
                        String userEmail = response.getHeaders().getFirst("X-User-Email");
                        String rolesHeader = response.getHeaders().getFirst("X-User-Roles");
                        if (userId == null || rolesHeader == null) {
                            throw new ResponseStatusException(org.springframework.http.HttpStatus.UNAUTHORIZED, "Missing validated auth headers");
                        }

                        Set<String> roles = Arrays.stream(rolesHeader.split(","))
                                .map(String::trim)
                                .filter(role -> !role.isEmpty())
                                .collect(Collectors.toSet());
                        return new AuthenticatedUserPrincipal(userId, userEmail, roles);
                    });

        } catch (RestClientException e) {
            throw new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE, "Auth service unavailable", e);
        }
    }
}
