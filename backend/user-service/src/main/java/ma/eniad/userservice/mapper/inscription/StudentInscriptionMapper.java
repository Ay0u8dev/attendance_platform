package ma.eniad.userservice.mapper.inscription;

import org.mapstruct.Mapper;

import ma.eniad.userservice.dto.inscription.StudentInscriptionRequestDTO;
import ma.eniad.userservice.dto.inscription.StudentInscriptionResponseDTO;
import ma.eniad.userservice.entity.Inscription;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

@Mapper(componentModel = "spring")
public interface StudentInscriptionMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "student", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    Inscription toEntity(StudentInscriptionRequestDTO dto);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "student", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "anneeUniversitaire", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    void updateEntity(StudentInscriptionRequestDTO dto, @MappingTarget Inscription entity);

    @Mapping(target = "studentId", source = "student.id")
    @Mapping(target = "studentFirstName", source = "student.firstName")
    @Mapping(target = "studentLastName", source = "student.lastName")
    @Mapping(target = "formationId", source = "formation.id")
    @Mapping(target = "formationName", source = "formation.name")
    @Mapping(target = "groupeId", source = "groupe.id")
    @Mapping(target = "groupeName", source = "groupe.name")
    @Mapping(target = "academicYearId", source = "anneeUniversitaire.id")
    @Mapping(target = "academicYearName", source = "anneeUniversitaire.name")
    StudentInscriptionResponseDTO toResponse(Inscription entity);
}
