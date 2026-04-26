package ma.eniad.authservice.exceptions;

public class AccountNotFoundException extends AuthenticationException {
    public AccountNotFoundException() {
        super("Compte introuvable. Contactez l'administrateur.");
    }
}
