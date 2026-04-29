package ma.eniad.userservice.dto.structure;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class ModuleResponseDTO {
    private Long id;
    private String name;
    private String code;
    private Integer semester;
    private Integer hours;
    private Long formationId;
}
