package ma.eniad.userservice.controller.student;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.student.InternalFaceProfileRequest;
import ma.eniad.userservice.dto.student.InternalFaceProfileResponse;
import ma.eniad.userservice.dto.student.InternalStoredFaceProfileResponse;
import ma.eniad.userservice.service.student.StudentFaceProfileService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/users/internal/students")
@RequiredArgsConstructor
public class InternalStudentFaceProfileController {
    private final StudentFaceProfileService faceProfileService;

    @PutMapping("/{studentId}/face-profile")
    public ResponseEntity<InternalFaceProfileResponse> enroll(
            @PathVariable Long studentId,
            @Valid @RequestBody InternalFaceProfileRequest request
    ) {
        return ResponseEntity.ok(faceProfileService.enroll(studentId, request));
    }

    @GetMapping("/{studentId}/face-profile")
    public ResponseEntity<InternalStoredFaceProfileResponse> getFaceProfile(
            @PathVariable Long studentId
    ) {
        return ResponseEntity.ok(faceProfileService.getStoredProfile(studentId));
    }
}
