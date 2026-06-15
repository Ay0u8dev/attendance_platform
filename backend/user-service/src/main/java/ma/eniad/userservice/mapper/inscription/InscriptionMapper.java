package ma.eniad.userservice.mapper.inscription;

import org.mapstruct.Mapper;

import ma.eniad.userservice.dto.inscription.InscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.InscriptionResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface InscriptionMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "student", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Inscription toEntity(InscriptionRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "student", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(InscriptionRequestDTO dto, @MappingTarget Inscription entity);

    @Mapping(target = "studentId", source = "student.id")
    @Mapping(target = "studentFirstName", source = "student.firstName")
    @Mapping(target = "studentLastName", source = "student.lastName")
    @Mapping(target = "formationId", source = "formation.id")
    @Mapping(target = "formationName", source = "formation.name")
    @Mapping(target = "groupeId", source = "groupe.id")
    @Mapping(target = "groupeName", source = "groupe.name")
    @Mapping(target = "academicYearId", source = "anneeUniversitaire.id")
    @Mapping(target = "academicYearName", source = "anneeUniversitaire.name")
    InscriptionResponseDTO toResponse(Inscription entity);
}
