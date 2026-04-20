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

@Slf4j
@RestControllerAdvice
public class GlobalExceptionHandler {

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

    @ExceptionHandler(AuthenticationException.class)
    public ResponseEntity<Map<String, Object>> handleAuthenticationException(
            AuthenticationException ex,
            WebRequest request) {

        return buildErrorResponse(HttpStatus.UNAUTHORIZED, "Erreur d'authentification : " + ex.getMessage(), request);
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
        body.put("status", status.value());
        body.put("message", message);
        body.put("timestamp", LocalDateTime.now());
        body.put("path", request.getDescription(false).replace("uri=", ""));
        return new ResponseEntity<>(body, status);
    }
}
