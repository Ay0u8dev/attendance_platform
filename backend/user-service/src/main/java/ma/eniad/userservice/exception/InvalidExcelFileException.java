package ma.eniad.userservice.exception;

public class InvalidExcelFileException
    extends RuntimeException {

    public InvalidExcelFileException(
        String message
    ) {
        super(message);
    }
}