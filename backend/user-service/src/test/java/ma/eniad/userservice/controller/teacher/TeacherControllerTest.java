package ma.eniad.userservice.controller.teacher;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import java.util.List;
import java.util.Set;

import ma.eniad.userservice.entity.enums.Role;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.ResponseEntity;

import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherProfileDto;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.dto.student.UpdateProfilePhotoRequest;
import ma.eniad.userservice.controller.dto.PresignedUrlResponse;
import ma.eniad.userservice.service.CloudflareR2Service;
import ma.eniad.userservice.service.teacher.TeacherService;

@ExtendWith(MockitoExtension.class)
class TeacherControllerTest {
    private TeacherController controller;

    @Mock
    private TeacherService teacherService;

    @Mock
    private CloudflareR2Service r2Service;

    @BeforeEach
    void setUp() {
        controller = new TeacherController(teacherService, r2Service);
    }

    @Test
    void create_returnsCreated() throws Exception {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.create(any(TeacherRequestDTO.class))).thenReturn(response);

        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@example.com");

        ResponseEntity<TeacherResponseDTO> result = controller.create(request);

        assertThat(result.getStatusCode().value()).isEqualTo(201);
        assertThat(result.getBody()).isEqualTo(response);
    }

    @Test
    void getAll_returnsOk() {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.getAll()).thenReturn(List.of(response));

        ResponseEntity<List<TeacherResponseDTO>> result = controller.getAll();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).containsExactly(response);
        verify(teacherService).getAll();
    }

    @Test
    void getById_returnsOk() {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.getById(1L)).thenReturn(response);

        ResponseEntity<TeacherResponseDTO> result = controller.getById(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(response);
        verify(teacherService).getById(1L);
    }

    @Test
    void getProfile_returnsOk() {
        TeacherProfileDto profile = TeacherProfileDto.builder()
                .id(1L)
                .email("teacher@example.com")
                .firstName("Ahmed")
                .lastName("Bennani")
                .moduleCount(2)
                .groupCount(1)
                .formationCount(1)
                .build();

        when(teacherService.getCurrentProfile()).thenReturn(profile);

        ResponseEntity<TeacherProfileDto> result = controller.getProfile();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(profile);
        verify(teacherService).getCurrentProfile();
    }

    @Test
    void updateProfilePhoto_returnsOk() {
        TeacherProfileDto profile = TeacherProfileDto.builder()
                .id(1L)
                .pfpUrl("https://example.com/avatar.png")
                .build();
        UpdateProfilePhotoRequest request = new UpdateProfilePhotoRequest();
        request.setPfpUrl("https://example.com/avatar.png");

        when(teacherService.updateCurrentProfilePhoto("https://example.com/avatar.png")).thenReturn(profile);

        ResponseEntity<TeacherProfileDto> result = controller.updateProfilePhoto(request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(profile);
        verify(teacherService).updateCurrentProfilePhoto("https://example.com/avatar.png");
    }

    @Test
    void removeProfilePhoto_returnsOk() {
        TeacherProfileDto profile = TeacherProfileDto.builder()
                .id(1L)
                .pfpUrl(null)
                .build();

        when(teacherService.removeCurrentProfilePhoto()).thenReturn(profile);

        ResponseEntity<TeacherProfileDto> result = controller.removeProfilePhoto();

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isSameAs(profile);
        verify(teacherService).removeCurrentProfilePhoto();
    }

    @Test
    void getProfilePhotoPresignedUrl_returnsUploadUrl() {
        when(r2Service.generatePresignedUploadUrl(any(String.class), any(String.class)))
                .thenReturn("https://upload.example.com");

        ResponseEntity<PresignedUrlResponse> result = controller.getProfilePhotoPresignedUrl("image/png");

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isNotNull();
        assertThat(result.getBody().getUrl()).isEqualTo("https://upload.example.com");
        assertThat(result.getBody().getKey()).startsWith("profile-photos/").endsWith(".png");
    }

    @Test
    void update_returnOk() throws Exception {
        TeacherResponseDTO response = TeacherResponseDTO.builder()
                .id(1L)
                .email("teacher@example.com")
                .roles(Set.of(Role.TEACHER))
                .build();

        when(teacherService.update(any(Long.class), any(TeacherRequestDTO.class))).thenReturn(response);

        TeacherRequestDTO request = new TeacherRequestDTO();
        request.setEmail("teacher@example.com");

        ResponseEntity<TeacherResponseDTO> result = controller.update(1L, request);

        assertThat(result.getStatusCode().value()).isEqualTo(200);
        assertThat(result.getBody()).isEqualTo(response);
        verify(teacherService).update(1L, request);
    }

    @Test
    void delete_returnsNoContent() throws Exception {
        doNothing().when(teacherService).delete(1L);

        ResponseEntity<Void> result = controller.delete(1L);

        assertThat(result.getStatusCode().value()).isEqualTo(204);
        verify(teacherService).delete(1L);
    }
}
