package ma.eniad.authservice.exceptions;

public class InvalidDomainException extends RuntimeException {
    public InvalidDomainException(String email) {
        super("Accès refusé : le domaine de l'email '" + email
              + "' n'est pas autorisé. Utilisez votre adresse @ump.ac.ma");
    }
}
