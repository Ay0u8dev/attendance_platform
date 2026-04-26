package ma.eniad.authservice.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.authservice.exceptions.AuthenticationException;
import ma.eniad.authservice.exceptions.InvalidDomainException;
import ma.eniad.authservice.exceptions.InvalidTokenException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.HashMap;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class GoogleTokenService {

    @Value("${google.client-id}")
    private String clientId;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    public Map<String, String> validateWithGoogleApi(String googleToken) {
        try {
            String encodedToken = URLEncoder.encode(googleToken, StandardCharsets.UTF_8);
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + encodedToken;
            String response = restTemplate.getForObject(url, String.class);
            if (response == null) {
                throw new RuntimeException("Empty response from Google tokeninfo endpoint");
            }
            JsonNode json = objectMapper.readTree(response);

            // Vérifier que le token est bien destiné à notre app
            JsonNode audNode = json.get("aud");
            if (audNode == null) {
                throw new RuntimeException("Missing 'aud' claim in token");
            }
            String aud = audNode.asText();
            if (!aud.equals(clientId)) {
                throw new RuntimeException("Token non destiné à cette application");
            }

            // Vérifier que l'email est vérifié
            JsonNode emailVerifiedNode = json.get("email_verified");
            if (emailVerifiedNode == null || !emailVerifiedNode.asText().equals("true")) {
                throw new RuntimeException("Email non vérifié par Google");
            }

            // Vérifier le domaine autorisé
            JsonNode emailNode = json.get("email");
            if (emailNode == null) {
                throw new RuntimeException("Missing 'email' claim in token");
            }
            String email = emailNode.asText();

            if (!email.endsWith("@" + allowedDomain)) {
                throw new InvalidDomainException(allowedDomain);
            }

            Map<String, String> claims = new HashMap<>();
            claims.put("email", email);
            claims.put("picture", json.has("picture") ? json.get("picture").asText() : "");

            return claims;

        } catch (JsonProcessingException e) {
            throw new InvalidTokenException("Token invalide ou mal formé", e);
        } catch (AuthenticationException e) {
            throw e;
        } catch (Exception e) {
            throw new AuthenticationException("Token Google invalide : " + e.getMessage(), e);
        }
    }

}