package ma.eniad.userservice.mapper.inscription;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import ma.eniad.userservice.dto.inscription.TeacherAssignmentRequestDTO;
import ma.eniad.userservice.dto.inscription.TeacherAssignmentResponseDTO;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.TeacherAssignment;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;

@Mapper(componentModel = "spring")
public interface TeacherAssignmentMapper {
    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "teacher", ignore = true)
    @Mapping(target = "academicYear", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "module", ignore = true)
    TeacherAssignment toEntity(TeacherAssignmentRequestDTO request);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "teacher", ignore = true)
    @Mapping(target = "academicYear", ignore = true)
    @Mapping(target = "formation", ignore = true)
    @Mapping(target = "groupe", ignore = true)
    @Mapping(target = "module", ignore = true)
    void updateEntity(TeacherAssignmentRequestDTO request, @MappingTarget TeacherAssignment assignment);

    @Mapping(target = "teacherId", source = "teacher.id")
    @Mapping(target = "teacherEmail", source = "teacher.email")
    @Mapping(target = "teacherFirstName", source = "teacher.firstName")
    @Mapping(target = "teacherLastName", source = "teacher.lastName")
    @Mapping(target = "academicYearId", source = "academicYear.id")
    @Mapping(target = "academicYearName", source = "academicYear.name")
    @Mapping(target = "formationId", source = "formation.id")
    @Mapping(target = "formationName", source = "formation.name")
    @Mapping(target = "groupeId", source = "groupe.id")
    @Mapping(target = "groupeName", source = "groupe.name")
    @Mapping(target = "moduleId", source = "module.id")
    @Mapping(target = "moduleCode", source = "module.code")
    @Mapping(target = "moduleName", source = "module.name")
    TeacherAssignmentResponseDTO toResponse(TeacherAssignment assignment);

    @Mapping(target = "id", ignore = true)
    @Mapping(target = "createdAt", ignore = true)
    @Mapping(target = "updatedAt", ignore = true)
    @Mapping(target = "teacher", source = "teacher")
    @Mapping(target = "academicYear", source = "academicYear")
    @Mapping(target = "formation", source = "formation")
    @Mapping(target = "groupe", source = "groupe")
    @Mapping(target = "module", source = "module")
    TeacherAssignment toEntity(
        Teacher teacher,
        AnneeUniversitaire academicYear,
        Formation formation,
        Groupe groupe,
        Module module
    );
}