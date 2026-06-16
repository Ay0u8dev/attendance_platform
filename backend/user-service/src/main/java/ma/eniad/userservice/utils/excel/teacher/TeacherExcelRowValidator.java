package ma.eniad.userservice.utils.excel.teacher;

import java.util.ArrayList;
import java.util.List;

import jakarta.validation.Validator;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import ma.eniad.userservice.dto.excel.RowErrorDTO;
import ma.eniad.userservice.dto.teacher.TeacherExcelRowDTO;

@Component
public class TeacherExcelRowValidator {
    private final Validator validator;

    @Value("${app.allowed-domain}")
    private String allowedDomain;

    public TeacherExcelRowValidator(Validator validator) {
        this.validator = validator;
    }

    public List<RowErrorDTO> validate(TeacherExcelRowDTO row) {

        List<RowErrorDTO> errors = new ArrayList<>();

        validateFirstName(row, errors);
        validateLastName(row, errors);
        validateEmail(row, errors);
        validateRequired(row, "academicYear", row.getAcademicYear(), "Academic year is required", errors);
        validateRequired(row, "formationName", row.getFormationName(), "Formation is required", errors);
        validateRequired(row, "groupeCode", row.getGroupeCode(), "Groupe code is required", errors);
        validateRequired(row, "moduleCode", row.getModuleCode(), "Module code is required", errors);

        return errors;
    }

    private void validateFirstName(TeacherExcelRowDTO row, List<RowErrorDTO> errors) {

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

    private void validateLastName(TeacherExcelRowDTO row, List<RowErrorDTO> errors) {

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

    private void validateEmail(TeacherExcelRowDTO row, List<RowErrorDTO> errors) {

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

        String email = row.getEmail();
        if (email == null) {
            return; // Should not happen, but defensive guard
        }
        String normalizedEmail = email.trim().toLowerCase();
        String normalizedDomain = normalizeDomain(allowedDomain);
        if (!normalizedDomain.isEmpty() && !normalizedEmail.endsWith("@" + normalizedDomain)) {
            errors.add(buildError(
                row,
                "email",
                "Email must be in the @" + normalizedDomain + " domain"
            ));
        }
    }

    private void validateRequired(TeacherExcelRowDTO row,
                                  String field,
                                  String value,
                                  String message,
                                  List<RowErrorDTO> errors) {
        if (isBlank(value)) {
            errors.add(buildError(row, field, message));
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
        TeacherExcelRowDTO row,
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
