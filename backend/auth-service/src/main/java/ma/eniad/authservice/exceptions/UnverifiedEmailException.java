package ma.eniad.authservice.exceptions;

public class UnverifiedEmailException extends AuthenticationException {
    public UnverifiedEmailException() {
        super("Email non vérifié par Google");
    }
}
