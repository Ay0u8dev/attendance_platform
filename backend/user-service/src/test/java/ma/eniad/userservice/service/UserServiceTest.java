package ma.eniad.userservice.service;

import ma.eniad.userservice.dto.InternalTeacherIdentityDto;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private TeacherRepository teacherRepository;
    private InscriptionRepository inscriptionRepository;
    private AnneeUniversitaireRepository anneeUniversitaireRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        teacherRepository = mock(TeacherRepository.class);
        inscriptionRepository = mock(InscriptionRepository.class);
        anneeUniversitaireRepository = mock(AnneeUniversitaireRepository.class);
        userService = new UserService(userRepository, teacherRepository, inscriptionRepository, anneeUniversitaireRepository);
    }

    @Test
    void getTeacherIdentityByIdReturnsMinimalIdentity() {
        Teacher teacher = Teacher.builder()
                .id(77L)
                .firstName("Ayoub")
                .lastName("Elebbar")
                .email("teacher@ump.ac.ma")
                .build();
        when(teacherRepository.findById(77L)).thenReturn(Optional.of(teacher));

        InternalTeacherIdentityDto result = userService.getTeacherIdentityById(77L);

        assertThat(result.teacherId()).isEqualTo(77L);
        assertThat(result.firstName()).isEqualTo("Ayoub");
        assertThat(result.lastName()).isEqualTo("Elebbar");
    }

    @Test
    void getTeacherIdentityByIdThrowsWhenTeacherMissing() {
        when(teacherRepository.findById(77L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> userService.getTeacherIdentityById(77L))
                .isInstanceOf(ResponseStatusException.class)
                .extracting(ex -> ((ResponseStatusException) ex).getStatusCode())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }
}
