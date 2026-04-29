package ma.eniad.userservice.dto.structure;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class GroupeResponseDTO {
    private Long id;
    private String name;
    private Long formationId;
}
