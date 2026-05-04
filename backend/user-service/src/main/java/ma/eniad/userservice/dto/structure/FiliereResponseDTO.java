package ma.eniad.userservice.dto.structure;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FiliereResponseDTO {
    private Long id;
    private String code;
    private String name;
}
