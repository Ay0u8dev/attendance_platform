package ma.eniad.userservice.service;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class CloudflareR2ServiceTest {

    @Mock
    private S3Client s3Client;

    private CloudflareR2Service r2Service;

    @BeforeEach
    void setUp() {
        r2Service = new CloudflareR2Service();
        ReflectionTestUtils.setField(r2Service, "bucketName", "attendance-bucket");
        ReflectionTestUtils.setField(r2Service, "publicUrl", "https://pub.example.r2.dev");
        ReflectionTestUtils.setField(r2Service, "s3Client", s3Client);
    }

    @Test
    void ownedProfilePhotoKeyExtractsOnlyProfilePhotoKeysFromConfiguredPublicUrl() {
        assertThat(r2Service.ownedProfilePhotoKey(
                "https://pub.example.r2.dev/profile-photos/student%201.png?v=123"
        )).contains("profile-photos/student 1.png");
        assertThat(r2Service.ownedProfilePhotoKey("https://pub.example.r2.dev/justifications/file.pdf"))
                .isEmpty();
        assertThat(r2Service.ownedProfilePhotoKey("https://lh3.googleusercontent.com/avatar.jpg"))
                .isEmpty();
    }

    @Test
    void deleteProfilePhotoIfOwnedDeletesOwnedR2Object() {
        boolean deleted = r2Service.deleteProfilePhotoIfOwned(
                "https://pub.example.r2.dev/profile-photos/student.png"
        );

        ArgumentCaptor<DeleteObjectRequest> requestCaptor = ArgumentCaptor.forClass(DeleteObjectRequest.class);
        verify(s3Client).deleteObject(requestCaptor.capture());
        assertThat(deleted).isTrue();
        assertThat(requestCaptor.getValue().bucket()).isEqualTo("attendance-bucket");
        assertThat(requestCaptor.getValue().key()).isEqualTo("profile-photos/student.png");
    }

    @Test
    void deleteProfilePhotoIfOwnedSkipsExternalUrls() {
        boolean deleted = r2Service.deleteProfilePhotoIfOwned("https://lh3.googleusercontent.com/avatar.jpg");

        assertThat(deleted).isFalse();
        verify(s3Client, never()).deleteObject(any(DeleteObjectRequest.class));
    }

    @Test
    void deleteProfilePhotoIfOwnedPropagatesR2DeleteFailure() {
        doThrow(new RuntimeException("delete failed"))
                .when(s3Client)
                .deleteObject(any(DeleteObjectRequest.class));

        org.assertj.core.api.Assertions.assertThatThrownBy(() ->
                r2Service.deleteProfilePhotoIfOwned("https://pub.example.r2.dev/profile-photos/student.png")
        )
                .isInstanceOf(RuntimeException.class)
                .hasMessage("delete failed");
    }
}
