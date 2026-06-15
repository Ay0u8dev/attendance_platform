package ma.eniad.userservice.dto.teacher;

import java.util.List;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Builder
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class TeacherChangeDTO {
    private int rowNumber;
    private String entityType;
    private String identifier;
    private String action;
    private List<String> changes;
}
