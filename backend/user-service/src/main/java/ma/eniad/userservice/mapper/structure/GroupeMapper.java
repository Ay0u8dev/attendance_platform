package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.GroupeRequestDTO;
import ma.eniad.userservice.dto.structure.GroupeResponseDTO;
import ma.eniad.userservice.entity.structure.Groupe;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface GroupeMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "formation", ignore = true)
    Groupe toEntity(GroupeRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    @Mapping(target = "formation", ignore = true)
    void updateEntity(GroupeRequestDTO dto, @MappingTarget Groupe entity);

    @Mapping(target = "formationId", source = "formation.id")
    GroupeResponseDTO toResponse(Groupe entity);
}
