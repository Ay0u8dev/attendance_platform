package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.CycleRequestDTO;
import ma.eniad.userservice.dto.structure.CycleResponseDTO;
import ma.eniad.userservice.entity.structure.Cycle;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface CycleMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Cycle toEntity(CycleRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(CycleRequestDTO dto, @MappingTarget Cycle entity);

    CycleResponseDTO toResponse(Cycle entity);
}
