package ma.eniad.userservice.utils.excel.teacher;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import java.util.stream.Stream;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import ma.eniad.userservice.dto.teacher.TeacherExcelRowDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.MethodSource;
import org.springframework.test.util.ReflectionTestUtils;

class TeacherExcelRowValidatorTest {

    private TeacherExcelRowValidator rowValidator;

    @BeforeEach
    void setUp() {
        Validator validator = Validation.buildDefaultValidatorFactory().getValidator();
        rowValidator = new TeacherExcelRowValidator(validator);
        ReflectionTestUtils.setField(rowValidator, "allowedDomain", "ump.ac.ma");
    }

    @ParameterizedTest
    @MethodSource("invalidEmails")
    void validateRejectsInvalidEmailFormatsWithOneEmailError(String email) {
        TeacherExcelRowDTO row = validRow(email);

        List<String> emailErrors = rowValidator.validate(row).stream()
                .filter(error -> error.getField().equals("email"))
                .map(error -> error.getMessage())
                .toList();

        assertThat(emailErrors).containsExactly("Invalid email format");
    }

    @Test
    void validateAcceptsStrictValidEmail() {
        TeacherExcelRowDTO row = validRow("valid.teacher@ump.ac.ma");

        assertThat(rowValidator.validate(row)).isEmpty();
    }

    private static Stream<String> invalidEmails() {
        return Stream.of(
                "abc",
                "teacher@",
                "@test.com",
                "teacher..name@ump.ac.ma",
                "teacher name@ump.ac.ma",
                "teacher@ump..ac.ma",
                "teacher@.ump.ac.ma",
                "teacher.@ump.ac.ma"
        );
    }

    private static TeacherExcelRowDTO validRow(String email) {
        return TeacherExcelRowDTO.builder()
                .rowNumber(2)
                .firstName("Valid")
                .lastName("Teacher")
                .email(email)
                .academicYear("2025/2026")
                .formationName("GI1")
                .groupeCode("GI1-A")
                .moduleCode("JAVA")
                .build();
    }
}
