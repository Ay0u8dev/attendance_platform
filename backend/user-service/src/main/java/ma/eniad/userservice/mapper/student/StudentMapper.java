package ma.eniad.userservice.mapper.student;

import ma.eniad.userservice.dto.student.StudentExcelRowDTO;
import ma.eniad.userservice.dto.student.StudentRequestDTO;
import ma.eniad.userservice.dto.student.StudentResponseDTO;
import ma.eniad.userservice.entity.Student;
import org.mapstruct.BeanMapping;
import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;
import org.mapstruct.NullValuePropertyMappingStrategy;
import org.mapstruct.ReportingPolicy;

@Mapper(
        componentModel = "spring",
        unmappedTargetPolicy = ReportingPolicy.WARN
)
public interface StudentMapper {

    /**
     * Maps a create request to a new Student entity.
     * Security-sensitive and auto-managed fields are explicitly ignored
     * and set manually in the service layer.
     */
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "roles",        ignore = true)
    @Mapping(target = "enabled",      ignore = true)
    @Mapping(target = "firstLogin",   ignore = true)
    @Mapping(target = "embeddings",   ignore = true)
    @Mapping(target = "inscriptions", ignore = true)
    Student toEntity(StudentRequestDTO request);

    /**
     * Applies an update request onto an existing Student entity in-place.
     * Null fields in the request are ignored to avoid accidental overwrites
     * of unchanged values during partial updates.
     */
    @BeanMapping(nullValuePropertyMappingStrategy = NullValuePropertyMappingStrategy.IGNORE)
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "roles",        ignore = true)
    @Mapping(target = "enabled",      ignore = true)
    @Mapping(target = "firstLogin",   ignore = true)
    @Mapping(target = "embeddings",   ignore = true)
    @Mapping(target = "inscriptions", ignore = true)
    void updateEntity(StudentRequestDTO request, @MappingTarget Student student);

    /**
     * Maps a Student entity to its response DTO.
     * Lazy-loaded fields (inscriptions, embeddings) are not included
     * to prevent LazyInitializationException and avoid data exposure.
     */
    StudentResponseDTO toResponse(Student student);

    /**
     * Maps an Excel row to a new Student entity.
     * Same security controls as standard create mapping.
     */
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "pfpUrl",       ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "roles",        ignore = true)
    @Mapping(target = "enabled",      ignore = true)
    @Mapping(target = "firstLogin",   ignore = true)
    @Mapping(target = "embeddings",   ignore = true)
    @Mapping(target = "inscriptions", ignore = true)
    Student toEntity(StudentExcelRowDTO row);
}