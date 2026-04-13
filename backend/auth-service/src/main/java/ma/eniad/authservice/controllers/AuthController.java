package ma.eniad.authservice.controllers;

import io.jsonwebtoken.Claims;
import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.authservice.client.UserServiceClient;
import ma.eniad.authservice.dto.UserDto;
import ma.eniad.authservice.services.GoogleTokenService;
import ma.eniad.authservice.services.JwtService;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final UserServiceClient userServiceClient;
    private final JwtService jwtService;
    private final GoogleTokenService googleTokenService;

    @GetMapping("/validate")
    @Operation(
            summary = "Validation du JWT",
            description = "Endpoint ForwardAuth: valide un access token et renvoie les headers X-User-*."
    )
    public ResponseEntity<?> validateToken(
            @RequestHeader(name = "Authorization", required = false) String authorizationHeader
    ) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token d'accès manquant ou mal formé");
        }

        String token = authorizationHeader.substring(7);

        try {
            Claims claims = jwtService.parseAndValidateAccessToken(token);
            String userId = jwtService.extractUserId(claims);
            String email = claims.get("email", String.class);
            String role = jwtService.extractRoles(claims).stream().findFirst().orElse("USER");

            return ResponseEntity.ok()
                    .header("X-User-Id", userId)
                    .header("X-User-Role", role)
                    .header("X-User-Email", email)
                    .build();
        } catch (RuntimeException ex) {
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Token d'accès invalide: " + ex.getMessage());
        }
    }

    // ── Login avec Google ──
    @PostMapping("/login")
    @Operation(
            summary = "Connexion via Google",
            description = "Envoyer le id_token Google reçu depuis le frontend. " +
                    "L'email doit avoir le domaine @ump.ac.ma pour accéder à l'application."
    )
    public ResponseEntity<?> loginWithGoogle(@RequestBody Map<String, String> body) {
        try {
            // 1. Valider et récupérer le token
            String googleToken = body.get("idToken");

            if (googleToken == null || googleToken.isEmpty()) {
                log.warn("[AUTH] Tentative de connexion sans token");
                return ResponseEntity
                        .badRequest()
                        .body(Map.of("message", "Token Google requis"));
            }

            log.info("[AUTH] Validation du token Google en cours...");

            // 2. Valider le token avec l'API Google et extraire les claims
            // Cette étape vérifie aussi le domaine @ump.ac.ma
            Map<String, String> googleClaims = googleTokenService.validateWithGoogleApi(googleToken);
            String email = googleClaims.get("email");

            log.info("[AUTH] Token validé avec succès pour: {}", email);
            log.info("[AUTH] ✓ Domaine @ump.ac.ma vérifié pour {}", email);

            // 3. user-service est le seul propriétaire du cycle de vie des utilisateurs
            UserDto user = userServiceClient.findOrCreateUser(Map.of(
                    "email", email,
                    "username", googleClaims.getOrDefault("username", ""),
                    "firstname", googleClaims.get("firstname"),
                    "lastname", googleClaims.get("lastname"),
                    "picture", googleClaims.get("picture")
            ));

            // 4. Générer notre propre JWT interne
            String jwtToken = jwtService.generateToken(user);

            log.info("[AUTH] ✓ Connexion réussie pour {}", email);

            return ResponseEntity.ok(Map.of(
                    "accessToken", jwtToken
            ));

        } catch (RuntimeException ex) {
            // Autre erreur de validation
            log.error("[AUTH] ✗ Erreur lors de la validation: {}", ex.getMessage());
            if (ex.getMessage() != null && ex.getMessage().contains("Email non vérifié")) {
                return ResponseEntity
                        .status(HttpStatus.FORBIDDEN)
                        .body(Map.of(
                                "status", 403,
                                "message", "Email non vérifié par Google"
                        ));
            }
            return ResponseEntity
                    .status(HttpStatus.UNAUTHORIZED)
                    .body(Map.of(
                            "status", 401,
                            "message", "Erreur d'authentification: " + ex.getMessage()
                    ));
        }
    }


}
