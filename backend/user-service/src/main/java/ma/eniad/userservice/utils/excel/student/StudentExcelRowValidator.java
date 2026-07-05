package ma.eniad.userservice.utils.excel.student;

import java.util.ArrayList;
import java.util.List;
import java.util.regex.Pattern;

import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.student.StudentExcelRowDTO;


@Component
public class StudentExcelRowValidator {
    private static final Pattern STRICT_EMAIL_PATTERN = Pattern.compile(
        "^[^\\s@.](?:[^\\s@]*[^\\s@.])?@(?:[^\\s@.]+\\.)+[^\\s@.]+$"
    );

    private final Validator validator;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    public StudentExcelRowValidator(Validator validator) {
        this.validator = validator;
    }

    public List<RowErrorDTO> validate(StudentExcelRowDTO row) {

        List<RowErrorDTO> errors = new ArrayList<>();

        validateFirstName(row, errors);
        validateLastName(row, errors);
        validateEmail(row, errors);
        validateNumApogee(row, errors);
        validateRequired(row, "academicYear", row.getAcademicYear(), "Academic year is required", errors);
        validateRequired(row, "formationName", row.getFormationName(), "Formation is required", errors);
        validateRequired(row, "groupeCode", row.getGroupeCode(), "Groupe code is required", errors);

        return errors;
    }

    private void validateFirstName(StudentExcelRowDTO row, List<RowErrorDTO> errors) {

        if (isBlank(row.getFirstName())) {
            errors.add(buildError(
                row,
                "firstName",
                "First name is required"
            ));
            return;
        }

        if (row.getFirstName().length() > 100) {
            errors.add(buildError(
                row,
                "firstName",
                "First name exceeds 100 characters"
            ));
        }
    }

    private void validateLastName(StudentExcelRowDTO row, List<RowErrorDTO> errors) {

        if (isBlank(row.getLastName())) {
            errors.add(buildError(
                row,
                "lastName",
                "Last name is required"
            ));
            return;
        }

        if (row.getLastName().length() > 100) {
            errors.add(buildError(
                row,
                "lastName",
                "Last name exceeds 100 characters"
            ));
        }
    }

    private void validateEmail(StudentExcelRowDTO row, List<RowErrorDTO> errors) {

        if (isBlank(row.getEmail())) {
            errors.add(buildError(
                row,
                "email",
                "Email is required"
            ));
            return;
        }

        String normalizedEmail = row.getEmail().trim().toLowerCase();

        if (normalizedEmail.length() > 254) {
            errors.add(buildError(
                row,
                "email",
                "Email exceeds 254 characters"
            ));
            return;
        }

        if (!isStrictEmail(normalizedEmail) || !validator.validateProperty(row, "email").isEmpty()) {
            errors.add(buildError(
                row,
                "email",
                "Invalid email format"
            ));
            return;
        }

        String normalizedDomain = normalizeDomain(allowedDomain);
        if (!normalizedDomain.isEmpty() && !normalizedEmail.endsWith("@" + normalizedDomain)) {
            errors.add(buildError(
                row,
                "email",
                "Email must be in the @" + normalizedDomain + " domain"
            ));
        }
    }

    private void validateNumApogee(StudentExcelRowDTO row, List<RowErrorDTO> errors) {

        if (isBlank(row.getNumApogee())) {
            errors.add(buildError(
                row,
                "numApogee",
                "Apogee number is required"
            ));
            return;
        }

        if (row.getNumApogee().length() > 30) {
            errors.add(buildError(
                row,
                "numApogee",
                "Apogee number exceeds 30 characters"
            ));
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private void validateRequired(StudentExcelRowDTO row,
                                  String field,
                                  String value,
                                  String message,
                                  List<RowErrorDTO> errors) {
        if (isBlank(value)) {
            errors.add(buildError(row, field, message));
        }
    }

    private String normalizeDomain(String domain) {
        if (domain == null) {
            return "";
        }

        String normalized = domain.trim().toLowerCase();
        if (normalized.startsWith("@")) {
            normalized = normalized.substring(1);
        }

        return normalized;
    }

    private boolean isStrictEmail(String email) {
        return STRICT_EMAIL_PATTERN.matcher(email).matches()
            && !email.contains("..")
            && !email.substring(0, email.indexOf('@')).contains("..")
            && !email.substring(email.indexOf('@') + 1).contains("..");
    }

    private RowErrorDTO buildError(
        StudentExcelRowDTO row,
        String field,
        String message
    ) {
        return RowErrorDTO.builder()
            .rowNumber(row.getRowNumber())
            .field(field)
            .message(message)
            .build();
    }
}
