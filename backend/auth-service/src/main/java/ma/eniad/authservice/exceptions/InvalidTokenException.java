package ma.eniad.authservice.exceptions;

public class InvalidTokenException extends AuthenticationException {
    public InvalidTokenException(String message, Throwable cause) {
        super(message, cause);
    }
}
