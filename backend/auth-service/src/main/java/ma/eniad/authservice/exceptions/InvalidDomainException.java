package ma.eniad.authservice.exceptions;

public class InvalidDomainException extends RuntimeException {
    public InvalidDomainException(String allowedDomain) {
        super("Email n'est pas autorisé, utilisez une adresse @" + allowedDomain);
    }
}
