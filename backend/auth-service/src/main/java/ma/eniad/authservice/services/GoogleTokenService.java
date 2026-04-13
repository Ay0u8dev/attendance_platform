package ma.eniad.authservice.services;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.authservice.exceptions.InvalidDomainException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

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
            String url = "https://oauth2.googleapis.com/tokeninfo?id_token=" + googleToken;
            String response = restTemplate.getForObject(url, String.class);
            JsonNode json = objectMapper.readTree(response);

            // Vérifier que le token est bien destiné à notre app
            String aud = json.get("aud").asText();
            if (!aud.equals(clientId)) {
                throw new RuntimeException("Token non destiné à cette application");
            }

            // Vérifier que l'email est vérifié
            String emailVerified = json.get("email_verified").asText();
            if (!emailVerified.equals("true")) {
                throw new RuntimeException("Email non vérifié par Google");
            }

            // Vérifier le domaine autorisé
            String email = json.get("email").asText();

            if (!email.endsWith("@" + allowedDomain)) {
                throw new InvalidDomainException(email);
            }

            Map<String, String> claims = new HashMap<>();
            claims.put("email", email);
            claims.put("username", json.get("name").asText());
            claims.put("firstname", json.get("given_name").asText());
            claims.put("lastname", json.has("family_name") ? json.get("family_name").asText() : "");
            claims.put("picture", json.has("picture") ? json.get("picture").asText() : "");

            return claims;

        } catch (JsonProcessingException e) {
            throw new RuntimeException("Erreur de parsing JSON du token Google : " + e.getMessage(), e);
        } catch (RuntimeException e) {
            throw e; // Re-throw runtime exceptions
        } catch (Exception e) {
            throw new RuntimeException("Token Google invalide : " + e.getMessage(), e);
        }
    }

}