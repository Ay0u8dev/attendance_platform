package ma.eniad.justificationservice.service;

import java.net.URI;
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
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.PresignedGetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.PresignedPutObjectRequest;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;
import software.amazon.awssdk.services.s3.presigner.model.PutObjectPresignRequest;

@Slf4j
@Service
@RequiredArgsConstructor
public class CloudflareR2Service {

    private static final String DUMMY_ENDPOINT = "https://dummy.r2.cloudflarestorage.com";

    @Value("${cloudflare.r2.endpoint:" + DUMMY_ENDPOINT + "}")
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
        String finalEndpoint = endpointForPresigner();
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

        logR2ConfigurationStatus();
    }

    private String endpointForPresigner() {
        if (isPlaceholderEndpoint(endpoint)) {
            return DUMMY_ENDPOINT;
        }

        return endpoint.replaceAll("/+$", "");
    }

    private void logR2ConfigurationStatus() {
        if (isUsingPlaceholderCredentials()) {
            log.warn(
                    "R2 upload is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY, R2_SECRET_KEY and R2_BUCKET_NAME in backend/justification-service/.env"
            );
            return;
        }

        log.info("R2 upload configured for bucket '{}'.", bucketName);
    }

    private boolean isUsingPlaceholderCredentials() {
        return isPlaceholderEndpoint(endpoint)
                || "dummy-access-key".equals(accessKey)
                || "dummy-secret-key".equals(secretKey)
                || "dummy-bucket".equals(bucketName);
    }

    public boolean isR2Configured() {
        return !isUsingPlaceholderCredentials();
    }

    private boolean isPlaceholderEndpoint(String value) {
        return DUMMY_ENDPOINT.equals(value)
                || value.contains("<")
                || value.contains(">");
    }

    public String generatePresignedUploadUrl(String objectKey, String contentType) {
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

    public String generatePresignedDownloadUrl(String objectKey) {
        GetObjectRequest getObjectRequest = GetObjectRequest.builder()
                .bucket(bucketName)
                .key(objectKey)
                .build();

        GetObjectPresignRequest presignRequest = GetObjectPresignRequest.builder()
                .signatureDuration(Duration.ofMinutes(15))
                .getObjectRequest(getObjectRequest)
                .build();

        PresignedGetObjectRequest presignedRequest = presigner.presignGetObject(presignRequest);
        return presignedRequest.url().toString();
    }
}
