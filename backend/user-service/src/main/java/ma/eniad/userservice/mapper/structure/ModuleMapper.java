package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.ModuleRequestDTO;
import ma.eniad.userservice.dto.structure.ModuleResponseDTO;
import ma.eniad.userservice.entity.structure.Module;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface ModuleMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "formation", ignore = true)
    Module toEntity(ModuleRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "formation", ignore = true)
    void updateEntity(ModuleRequestDTO dto, @MappingTarget Module entity);

    @Mapping(target = "formationId", source = "formation.id")
    ModuleResponseDTO toResponse(Module entity);
}
