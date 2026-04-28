package ma.eniad.authservice.exceptions;

public class AccountDisabledException extends AuthenticationException {
    public AccountDisabledException() {
        super("Compte désactivé. Contactez l'administrateur.");
    }
}
