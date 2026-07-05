package ma.eniad.userservice.dto.teacher;

import java.time.LocalDateTime;
import java.util.List;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TeacherProfileDto {
    private Long id;
    private String email;
    private String firstName;
    private String lastName;
    private String pfpUrl;
    private boolean enabled;
    private boolean firstLogin;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private int moduleCount;
    private int groupCount;
    private int formationCount;
    private List<String> modules;
    private List<String> groupes;
    private List<String> formations;
    private List<String> filieres;
}
