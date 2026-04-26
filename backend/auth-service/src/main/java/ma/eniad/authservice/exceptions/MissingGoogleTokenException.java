package ma.eniad.authservice.exceptions;

public class MissingGoogleTokenException extends AuthenticationException {
    public MissingGoogleTokenException() {
        super("Token Google requis");
    }
}
