package ma.eniad.userservice.utils.excel.student;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Stream;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import ma.eniad.userservice.dto.student.StudentExcelRowDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.util.ReflectionTestUtils;

class StudentExcelRowValidatorTest {

    private StudentExcelRowValidator rowValidator;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        rowValidator = new StudentExcelRowValidator(validator);
        ReflectionTestUtils.setField(rowValidator, "allowedDomain", "ump.ac.ma");
    }

    @ParameterizedTest
    @MethodSource("invalidEmails")
    void validateRejectsInvalidEmailFormatsWithOneEmailError(String email) {
        StudentExcelRowDTO row = validRow(email);

        List<String> emailErrors = rowValidator.validate(row).stream()
                .filter(error -> error.getField().equals("email"))
                .map(error -> error.getMessage())
                .toList();

        assertThat(emailErrors).containsExactly("Invalid email format");
    }

    @Test
    void validateAcceptsStrictValidEmail() {
        StudentExcelRowDTO row = validRow("valid.u13@ump.ac.ma");

        assertThat(rowValidator.validate(row)).isEmpty();
    }

    private static Stream<String> invalidEmails() {
        return Stream.of(
                "abc",
                "student@",
                "@test.com",
                "student..name@ump.ac.ma",
                "student name@ump.ac.ma",
                "student@ump..ac.ma",
                "student@.ump.ac.ma",
                "student.@ump.ac.ma"
        );
    }

    private static StudentExcelRowDTO validRow(String email) {
        return StudentExcelRowDTO.builder()
                .rowNumber(2)
                .firstName("Valid")
                .lastName("Student")
                .email(email)
                .numApogee("A100")
                .academicYear("2025/2026")
                .formationName("GI")
                .groupeCode("GI-1")
                .build();
    }
}
