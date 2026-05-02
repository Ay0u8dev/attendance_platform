package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.AnneeRequestDTO;
import ma.eniad.userservice.dto.structure.AnneeResponseDTO;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface AnneeUniversitaireMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    AnneeUniversitaire toEntity(AnneeRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "deleted", ignore = true)
    void updateEntity(AnneeRequestDTO dto, @MappingTarget AnneeUniversitaire entity);

    AnneeResponseDTO toResponse(AnneeUniversitaire entity);
}
