package ma.eniad.authservice.exceptions;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;

import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;
import org.springframework.web.context.request.WebRequest;
import org.springframework.web.server.ResponseStatusException;

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

    @ExceptionHandler(ResponseStatusException.class)
    public ResponseEntity<Map<String, Object>> handleResponseStatusException(
            ResponseStatusException ex,
            WebRequest request) {
        HttpStatus status = HttpStatus.valueOf(ex.getStatusCode().value());
        String message = ex.getReason() != null ? ex.getReason() : "Request failed";
        return buildErrorResponse(status, message, request);
    }

    @ExceptionHandler(InvalidDomainException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidDomainException(
            InvalidDomainException ex,
            WebRequest request) {

        log.error("[AUTH] ✗ Erreur de domaine pour {}: {}", request.getDescription(false).replace("uri=", ""), ex.getMessage());

        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(InvalidTokenException.class)
    public ResponseEntity<Map<String, Object>> handleInvalidTokenException(
            InvalidTokenException ex,
            WebRequest request) {

        log.error("[AUTH] ✗ Erreur de parsing pour {}: {}", request.getDescription(false).replace("uri=", ""), ex.getMessage());

        return buildErrorResponse(HttpStatus.BAD_REQUEST, "Token invalide ou mal formé", request);
    }

    @ExceptionHandler(TokenAudienceMismatchException.class)
    public ResponseEntity<Map<String, Object>> handleTokenAudienceMismatchException(
            TokenAudienceMismatchException ex,
            WebRequest request) {

        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(UnverifiedEmailException.class)
    public ResponseEntity<Map<String, Object>> handleUnverifiedEmailException(
            UnverifiedEmailException ex,
            WebRequest request) {

        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(MissingGoogleTokenException.class)
    public ResponseEntity<Map<String, Object>> handleMissingGoogleTokenException(
            MissingGoogleTokenException ex,
            WebRequest request) {

        log.warn("[AUTH] ✗ Token Google manquant");
        return buildErrorResponse(HttpStatus.BAD_REQUEST, ex.getMessage(), request);
    }

    @ExceptionHandler(AccountNotFoundException.class)
    public ResponseEntity<Map<String, Object>> handleAccountNotFoundException(
            AccountNotFoundException ex,
            WebRequest request) {

        log.warn("[AUTH] ✗ Compte introuvable");
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(AccountDisabledException.class)
    public ResponseEntity<Map<String, Object>> handleAccountDisabledException(
            AccountDisabledException ex,
            WebRequest request) {

        log.warn("[AUTH] ✗ Compte désactivé");
        return buildErrorResponse(HttpStatus.FORBIDDEN, ex.getMessage(), request);
    }

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            AuthenticationException ex,
            WebRequest request) {

        return buildErrorResponse(HttpStatus.UNAUTHORIZED, ex.getMessage(), request);
    }

    @ExceptionHandler(RuntimeException.class)
    public ResponseEntity<Map<String, Object>> handleRuntimeException(
            RuntimeException ex,
            WebRequest request) {

        log.error("[AUTH] ✗ Runtime exception non geree pour {}", request.getDescription(false).replace("uri=", ""), ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur serveur inattendue s'est produite", request);
    }

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGlobalException(
            Exception ex,
            WebRequest request) {

        log.error("[AUTH] ✗ Exception non geree pour {}", request.getDescription(false).replace("uri=", ""), ex);
        return buildErrorResponse(HttpStatus.INTERNAL_SERVER_ERROR, "Une erreur serveur s'est produite", request);
    }

    private ResponseEntity<Map<String, Object>> buildErrorResponse(
            HttpStatus status,
            String message,
            WebRequest request) {
        Map<String, Object> body = new HashMap<>();
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return new ResponseEntity<>(body, status);
    }
}
