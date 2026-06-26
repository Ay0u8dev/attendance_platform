package ma.eniad.userservice.dto.student;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalStoredFaceProfileResponse {
    private Long studentId;
    private String embedding;
    private Integer dimension;
    private String model;
    private String format;
    private LocalDateTime faceEnrolledAt;
}
