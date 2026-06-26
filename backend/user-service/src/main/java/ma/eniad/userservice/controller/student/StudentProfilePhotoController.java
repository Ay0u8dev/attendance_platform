package ma.eniad.userservice.controller.student;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.http.HttpStatus;

@RestController
@RequestMapping("users/public/profile-photos")
public class StudentProfilePhotoController {

    @Value("${app.profile-photos.storage-dir:uploads/profile-photos}")
    private String storageDir;

    @GetMapping("/{filename:.+}")
    public ResponseEntity<Resource> getProfilePhoto(@PathVariable String filename) throws IOException {
        if (!filename.matches("[A-Za-z0-9._-]+")) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid photo filename");
        }

        Path directory = Paths.get(storageDir).toAbsolutePath().normalize();
        Path file = directory.resolve(filename).normalize();
        if (!file.startsWith(directory) || !Files.isRegularFile(file)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "Profile photo not found");
        }

        Resource resource = new UrlResource(file.toUri());
        String contentType = Files.probeContentType(file);
        MediaType mediaType = contentType != null
                ? MediaType.parseMediaType(contentType)
                : MediaType.APPLICATION_OCTET_STREAM;

        return ResponseEntity.ok()
                .contentType(mediaType)
                .header(HttpHeaders.CACHE_CONTROL, "public, max-age=31536000, immutable")
                .body(resource);
    }
}
