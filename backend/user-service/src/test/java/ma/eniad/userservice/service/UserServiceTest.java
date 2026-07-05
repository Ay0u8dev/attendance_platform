package ma.eniad.userservice.service;

import ma.eniad.userservice.dto.AuthUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.dto.teacher.InternalTeacherIdentityDto;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.enums.Role;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.inscription.StudentInscriptionRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

import java.util.Set;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceTest {

    private UserRepository userRepository;
    private TeacherRepository teacherRepository;
    private StudentInscriptionRepository inscriptionRepository;
    private AnneeUniversitaireRepository anneeUniversitaireRepository;
    private UserService userService;

    @BeforeEach
    void setUp() {
        userRepository = mock(UserRepository.class);
        teacherRepository = mock(TeacherRepository.class);
        inscriptionRepository = mock(StudentInscriptionRepository.class);
        anneeUniversitaireRepository = mock(AnneeUniversitaireRepository.class);
        userService = new UserService(userRepository, teacherRepository, inscriptionRepository, anneeUniversitaireRepository);
    }

    @Test
    void firstLoginStudentKeepsFirstLoginTrue() {
        User student = user(Role.STUDENT, true, "picture.jpg");
        AuthUserRequest request = request("picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isTrue();
        assertThat(student.isFirstLogin()).isTrue();
        verify(userRepository, never()).save(student);
    }

    @Test
    void firstLoginNonStudentChangesFirstLoginToFalse() {
        User teacher = user(Role.TEACHER, true, "picture.jpg");
        AuthUserRequest request = request("picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(teacher));
        when(userRepository.save(teacher)).thenReturn(teacher);

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isFalse();
        verify(userRepository).save(teacher);
    }

    @Test
    void existingUserWithFirstLoginFalseRemainsUnchanged() {
        User user = user(Role.STUDENT, false, "picture.jpg");
        AuthUserRequest request = request("picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(user));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isFalse();
        verify(userRepository, never()).save(user);
    }

    @Test
    void firstLoginStudentWithBlankProfilePictureSeedsGooglePicture() {
        User student = user(Role.STUDENT, true, null);
        AuthUserRequest request = request("new-picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));
        when(userRepository.save(student)).thenReturn(student);

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isTrue();
        assertThat(result.getPfpUrl()).isEqualTo("new-picture.jpg");
        verify(userRepository).save(student);
    }

    @Test
    void firstLoginTeacherWithBlankProfilePictureSeedsGooglePictureAndCompletesFirstLogin() {
        User teacher = user(Role.TEACHER, true, null);
        AuthUserRequest request = request("new-picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(teacher));
        when(userRepository.save(teacher)).thenReturn(teacher);

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isFalse();
        assertThat(result.getPfpUrl()).isEqualTo("new-picture.jpg");
        verify(userRepository).save(teacher);
    }

    @Test
    void firstLoginDoesNotOverwriteExistingProfilePicture() {
        User student = user(Role.STUDENT, true, "old-picture.jpg");
        AuthUserRequest request = request("new-picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isTrue();
        assertThat(result.getPfpUrl()).isEqualTo("old-picture.jpg");
        verify(userRepository, never()).save(student);
    }

    @Test
    void laterLoginDoesNotReseedRemovedProfilePicture() {
        User student = user(Role.STUDENT, false, null);
        AuthUserRequest request = request("new-picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isFalse();
        assertThat(result.getPfpUrl()).isNull();
        verify(userRepository, never()).save(student);
    }

    @Test
    void firstLoginAdminDoesNotSeedGoogleProfilePicture() {
        User admin = user(Role.ADMIN, true, null);
        AuthUserRequest request = request("new-picture.jpg");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(admin));
        when(userRepository.save(admin)).thenReturn(admin);

        UserResponseDto result = userService.findUser(request);

        assertThat(result.isFirstLogin()).isFalse();
        assertThat(result.getPfpUrl()).isNull();
        verify(userRepository).save(admin);
    }

    @Test
    void loginWithoutProfilePictureDoesNotClearUploadedProfilePicture() {
        User student = user(Role.STUDENT, false, "/api/users/public/profile-photos/student-1-photo.png");
        AuthUserRequest request = request(null);
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.getPfpUrl()).isEqualTo("/api/users/public/profile-photos/student-1-photo.png");
        assertThat(student.getPfpUrl()).isEqualTo("/api/users/public/profile-photos/student-1-photo.png");
        verify(userRepository, never()).save(student);
    }

    @Test
    void loginWithBlankProfilePictureDoesNotClearUploadedProfilePicture() {
        User student = user(Role.STUDENT, false, "/api/users/public/profile-photos/student-1-photo.png");
        AuthUserRequest request = request("   ");
        when(userRepository.findByEmail(request.getEmail())).thenReturn(Optional.of(student));

        UserResponseDto result = userService.findUser(request);

        assertThat(result.getPfpUrl()).isEqualTo("/api/users/public/profile-photos/student-1-photo.png");
        assertThat(student.getPfpUrl()).isEqualTo("/api/users/public/profile-photos/student-1-photo.png");
        verify(userRepository, never()).save(student);
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

    private User user(Role role, boolean firstLogin, String pfpUrl) {
        return User.builder()
                .id(1L)
                .email("user@ump.ac.ma")
                .roles(Set.of(role))
                .enabled(true)
                .firstLogin(firstLogin)
                .pfpUrl(pfpUrl)
                .build();
    }

    private AuthUserRequest request(String pfpUrl) {
        AuthUserRequest request = new AuthUserRequest();
        request.setEmail("user@ump.ac.ma");
        request.setPfpUrl(pfpUrl);
        return request;
    }
}
