package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.FiliereRequestDTO;
import ma.eniad.userservice.dto.structure.FiliereResponseDTO;
import ma.eniad.userservice.entity.structure.Filiere;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FiliereMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    Filiere toEntity(FiliereRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    void updateEntity(FiliereRequestDTO dto, @MappingTarget Filiere entity);

    FiliereResponseDTO toResponse(Filiere entity);
}
