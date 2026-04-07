package ma.eniad.authservice.controllers;

import java.util.Map;
import java.util.UUID;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import io.swagger.v3.oas.annotations.Operation;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import ma.eniad.authservice.exceptions.InvalidDomainException;
import ma.eniad.authservice.models.User;
import ma.eniad.authservice.models.enums.Role;
import ma.eniad.authservice.repositories.UserRepository;
import ma.eniad.authservice.services.GoogleTokenService;
import ma.eniad.authservice.services.JwtService;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Slf4j
public class AuthController {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;
    private final GoogleTokenService googleTokenService;

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
                googleToken = body.get("token"); // Fallback for compatibility
            }
            
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

            // 3. Chercher l'utilisateur ou le créer automatiquement
            User user = userRepository.findByEmail(email)
                    .orElseGet(() -> {
                        log.info("[AUTH] Création d'un nouvel utilisateur: {}", email);
                        User newUser = User.builder()
                                .firstname(googleClaims.get("firstname"))
                                .lastname(googleClaims.get("lastname"))
                                .email(email)
                                .password(passwordEncoder.encode(UUID.randomUUID().toString()))
                                .role(Role.USER)
                                .build();
                        return userRepository.save(newUser);
                    });

            // 4. Générer notre propre JWT interne
            String jwtToken = jwtService.generateToken(user);
            
            log.info("[AUTH] ✓ Connexion réussie pour {}", email);

            return ResponseEntity.ok(Map.of(
                "accessToken", jwtToken,
                "email",       email,
                "firstname",   googleClaims.get("firstname"),
                "lastname",    googleClaims.get("lastname"),
                "picture",     googleClaims.get("picture"),
                "role",        user.getRole().toString()
            ));
            
        } catch (InvalidDomainException ex) {
            // Domaine non autorisé
            log.warn("[AUTH] ✗ Accès refusé - Domaine non autorisé: {}", ex.getMessage());
            return ResponseEntity
                .status(HttpStatus.FORBIDDEN)
                .body(Map.of(
                    "status", 403,
                    "message", ex.getMessage()
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