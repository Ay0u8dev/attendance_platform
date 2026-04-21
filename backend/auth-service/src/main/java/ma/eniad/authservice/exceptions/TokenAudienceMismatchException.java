package ma.eniad.authservice.exceptions;

public class TokenAudienceMismatchException extends AuthenticationException {
    public TokenAudienceMismatchException() {
        super("Token non destiné à cette application");
    }
}
