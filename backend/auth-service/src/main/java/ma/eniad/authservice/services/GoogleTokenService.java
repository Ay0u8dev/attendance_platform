package ma.eniad.authservice.services;

import java.util.Base64;
import java.util.HashMap;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;

import lombok.RequiredArgsConstructor;
import ma.eniad.authservice.exceptions.InvalidDomainException;

@Service
@RequiredArgsConstructor
public class GoogleTokenService {

    @Value("${google.client-id}")
    private String clientId;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    // ─────────────────────────────────────────────
    // MÉTHODE 1 : Validation via API Google tokeninfo
    // ─────────────────────────────────────────────
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
            String hd = json.has("hd") ? json.get("hd").asText() : "";
            String email = json.get("email").asText();
            String expectedDomain = allowedDomain.replace("@", "");
            
            // Valider le domaine soit via le claim hd (Google Workspace) soit via l'email
            boolean domainValid = false;
            if (!hd.isEmpty()) {
                // Si hd est présent (compte Google Workspace)
                domainValid = hd.equals(expectedDomain);
            } else {
                // Sinon valider via l'email
                domainValid = email.endsWith("@" + expectedDomain);
            }
            
            if (!domainValid) {
                throw new InvalidDomainException(email);
            }

            Map<String, String> claims = new HashMap<>();
            claims.put("email",      email);
            claims.put("firstname",  json.get("given_name").asText());
            claims.put("lastname",   json.get("family_name").asText());
            claims.put("picture",    json.has("picture") ? json.get("picture").asText() : "");
            claims.put("sub",        json.get("sub").asText()); // Google user ID

            return claims;

        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException("Erreur de parsing JSON du token Google : " + e.getMessage(), e);
        } catch (RuntimeException e) {
            throw e; // Re-throw runtime exceptions
        } catch (Exception e) {
            throw new RuntimeException("Token Google invalide : " + e.getMessage(), e);
        }
    }

    // ─────────────────────────────────────────────
    // MÉTHODE 2 : Décodage manuel du JWT Google
    // (sans vérification de signature — usage interne)
    // ─────────────────────────────────────────────
    public Map<String, String> decodeGoogleToken(String googleToken) {
        try {
            // Le token Google est un JWT : header.payload.signature
            String[] parts = googleToken.split("\\.");
            if (parts.length != 3) {
                throw new RuntimeException("Format de token invalide");
            }

            // Décoder le payload (partie du milieu)
            String payload = new String(Base64.getUrlDecoder().decode(parts[1]));
            JsonNode json = objectMapper.readTree(payload);

            Map<String, String> claims = new HashMap<>();
            claims.put("email",     json.has("email")      ? json.get("email").asText()      : "");
            claims.put("firstname", json.has("given_name") ? json.get("given_name").asText() : "");
            claims.put("lastname",  json.has("family_name")? json.get("family_name").asText(): "");
            claims.put("picture",   json.has("picture")    ? json.get("picture").asText()    : "");
            claims.put("sub",       json.has("sub")        ? json.get("sub").asText()        : "");

            return claims;

        } catch (com.fasterxml.jackson.core.JsonProcessingException e) {
            throw new RuntimeException("Erreur de parsing JSON du token Google : " + e.getMessage(), e);
        } catch (IllegalArgumentException e) {
            throw new RuntimeException("Erreur de décodage Base64 du token : " + e.getMessage(), e);
        } catch (Exception e) {
            throw new RuntimeException("Erreur de décodage du token : " + e.getMessage(), e);
        }
    }
}