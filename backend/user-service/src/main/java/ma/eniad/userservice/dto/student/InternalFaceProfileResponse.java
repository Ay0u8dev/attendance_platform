package ma.eniad.userservice.dto.student;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InternalFaceProfileResponse {
    private Long studentId;
    private boolean enrolled;
    private boolean firstLogin;
    private LocalDateTime faceEnrolledAt;
    private boolean authenticationRefreshRequired;
}
