package ma.eniad.justificationservice.service;

import java.io.IOException;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.Duration;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Configuration;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudflareR2Service {

    @Value("${cloudflare.r2.endpoint:https://dummy.r2.cloudflarestorage.com}")
    private String endpoint;

    @Value("${cloudflare.r2.access-key:dummy-access-key}")
    private String accessKey;

    @Value("${cloudflare.r2.secret-key:dummy-secret-key}")
    private String secretKey;

    @Value("${cloudflare.r2.bucket-name:dummy-bucket}")
    private String bucketName;

    private S3Presigner presigner;

    @PostConstruct
    public void init() {
        AwsBasicCredentials credentials = AwsBasicCredentials.create(accessKey, secretKey);

        // Defensive fix: Cloudflare R2 dashboard gives an S3 API URL that includes the bucket name.
        // If the user pasted that into the .env, the SDK with pathStyleAccessEnabled(true) will append 
        // the bucket name a second time, creating a folder named after the bucket inside the bucket.
        String finalEndpoint = endpoint.replaceAll("/+$", "");
        if (finalEndpoint.endsWith("/" + bucketName)) {
            finalEndpoint = finalEndpoint.substring(0, finalEndpoint.length() - bucketName.length() - 1);
        }

        this.presigner = S3Presigner.builder()
                .endpointOverride(URI.create(finalEndpoint))
                .credentialsProvider(StaticCredentialsProvider.create(credentials))
                .region(Region.of("auto")) // Cloudflare R2 uses 'auto' region
                .serviceConfiguration(S3Configuration.builder()
                        .pathStyleAccessEnabled(true)
                        .build())
                .build();
    }

    public String generatePresignedUploadUrl(String objectKey, String contentType) {
        if (!isR2Configured()) {
            String encodedKey = URLEncoder.encode(objectKey, StandardCharsets.UTF_8);
            return "/api/justifications/upload?key=" + encodedKey;
        }

        PutObjectRequest putObjectRequest = PutObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .contentType(contentType)
                .build();

        PutObjectPresignRequest presignRequest = PutObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .putObjectRequest(putObjectRequest)
                .build();

        PresignedPutObjectRequest presignedRequest = presigner.presignPutObject(presignRequest);
        return presignedRequest.url().toString();
    }

    public void storeLocalUpload(String key, org.springframework.web.multipart.MultipartFile file) throws IOException {
        storeLocalUpload(key, file.getBytes());
    }

    public void storeLocalUpload(String key, byte[] content) throws IOException {
        Path uploadDir = Paths.get("uploads");
        Files.createDirectories(uploadDir);
        Path targetPath = uploadDir.resolve(key).normalize();

        if (!targetPath.startsWith(uploadDir)) {
            throw new IllegalArgumentException("Invalid upload key");
        }

        Files.createDirectories(targetPath.getParent());
        Files.write(targetPath, content);
    }

    public boolean isR2Configured() {
        return !("https://dummy.r2.cloudflarestorage.com".equals(endpoint)
                && "dummy-access-key".equals(accessKey)
                && "dummy-secret-key".equals(secretKey)
                && "dummy-bucket".equals(bucketName));
    }
}
