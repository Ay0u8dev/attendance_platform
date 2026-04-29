package ma.eniad.userservice.dto.structure;

import lombok.Builder;
import lombok.Getter;
import ma.eniad.userservice.entity.enums.CycleType;

@Getter
@Builder
public class CycleResponseDTO {
    private Long id;
    private String code;
    private String name;
    private CycleType type;
}
