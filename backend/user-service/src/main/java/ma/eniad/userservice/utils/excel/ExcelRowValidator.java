package ma.eniad.userservice.utils.excel;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import ma.eniad.userservice.dto.student.excel.RowErrorDTO;
import ma.eniad.userservice.dto.student.excel.StudentExcelRowDTO;


@Component
public class ExcelRowValidator {
    private final Validator validator;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    public ExcelRowValidator(Validator validator) {
        this.validator = validator;
    }

    public List<RowErrorDTO> validate(StudentExcelRowDTO row) {

        List<RowErrorDTO> errors = new ArrayList<>();

        validateFirstName(row, errors);
        validateLastName(row, errors);
        validateEmail(row, errors);
        validateNumApogee(row, errors);

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

        if (row.getEmail().length() > 254) {
            errors.add(buildError(
                row,
                "email",
                "Email exceeds 254 characters"
            ));
        }

        if (!validator.validateProperty(row, "email").isEmpty()) {
            errors.add(buildError(
                row,
                "email",
                "Invalid email format"
            ));
        }

        String normalizedEmail = row.getEmail().trim().toLowerCase();
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