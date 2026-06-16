package ma.eniad.userservice.mapper.structure;

import ma.eniad.userservice.dto.structure.FormationRequestDTO;
import ma.eniad.userservice.dto.structure.FormationResponseDTO;
import ma.eniad.userservice.entity.structure.Formation;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface FormationMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "filiere", ignore = true)
    @Mapping(target = "cycle", ignore = true)
    @Mapping(target = "groupes", ignore = true)
    @Mapping(target = "modules", ignore = true)
    Formation toEntity(FormationRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "filiere", ignore = true)
    @Mapping(target = "cycle", ignore = true)
    @Mapping(target = "groupes", ignore = true)
    @Mapping(target = "modules", ignore = true)
    void updateEntity(FormationRequestDTO dto, @MappingTarget Formation entity);

    @Mapping(target = "anneeUniversitaireId", source = "anneeUniversitaire.id")
    @Mapping(target = "filiereId", source = "filiere.id")
    @Mapping(target = "cycleId", source = "cycle.id")
    FormationResponseDTO toResponse(Formation entity);
}
