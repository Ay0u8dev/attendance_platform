package ma.eniad.authservice.exceptions;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;

import com.fasterxml.jackson.core.JsonProcessingException;

@RestControllerAdvice
public class GlobalExceptionHandler {

    /**
     * Gérer les exceptions de domaine non autorisé
     * Retourne 403 Forbidden avec message d'erreur
     */
    @ExceptionHandler(InvalidDomainException.class)
    public ResponseEntity<?> handleInvalidDomainException(
            InvalidDomainException ex,
            WebRequest request) {
        
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.FORBIDDEN.value());
        body.put("message", ex.getMessage());
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        
        return new ResponseEntity<>(body, HttpStatus.FORBIDDEN);
    }

    /**
     * Gérer les erreurs de token Google invalide
     * Retourne 400 Bad Request
     */
    @ExceptionHandler(value = {
        JsonProcessingException.class,
        IllegalArgumentException.class
    })
    public ResponseEntity<?> handleTokenParsingException(
            Exception ex,
            WebRequest request) {
        
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.BAD_REQUEST.value());
        body.put("message", "Token invalide ou mal formé : " + ex.getMessage());
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        
        return new ResponseEntity<>(body, HttpStatus.BAD_REQUEST);
    }

    /**
     * Gérer les autres exceptions RuntimeException
     * Retourne 401 Unauthorized
     */
    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<?> handleRuntimeException(
            RuntimeException ex,
            WebRequest request) {
        
        // Si le message contient "domaine", c'est déjà géré par InvalidDomainException
        // Donc on traite les autres runtime exceptions
        Map<String, Object> body = new HashMap<>();
        
        // Déterminer le code HTTP basé sur le message
        int statusCode = HttpStatus.UNAUTHORIZED.value();
        
        if (ex.getMessage() != null) {
            if (ex.getMessage().contains("non destiné")) {
                statusCode = HttpStatus.FORBIDDEN.value();
                body.put("message", "Token non destiné à cette application");
            } else if (ex.getMessage().contains("Email non vérifié")) {
                statusCode = HttpStatus.FORBIDDEN.value();
                body.put("message", "Email non vérifié par Google");
            } else {
                body.put("message", "Erreur d'authentification : " + ex.getMessage());
            }
        } else {
            body.put("message", "Erreur d'authentification");
        }
        
        body.put("status", statusCode);
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        
        HttpStatus status = HttpStatus.valueOf(statusCode);
        return new ResponseEntity<>(body, status);
    }

    /**
     * Gérer les exceptions générales non gérées
     * Retourne 500 Internal Server Error
     */
    @ExceptionHandler(Exception.class)
    public ResponseEntity<?> handleGlobalException(
            Exception ex,
            WebRequest request) {
        
        Map<String, Object> body = new HashMap<>();
        body.put("status", HttpStatus.INTERNAL_SERVER_ERROR.value());
        body.put("message", "Une erreur serveur s'est produite");
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        
        return new ResponseEntity<>(body, HttpStatus.INTERNAL_SERVER_ERROR);
    }
}
