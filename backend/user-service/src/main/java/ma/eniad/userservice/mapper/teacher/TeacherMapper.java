package ma.eniad.userservice.mapper.teacher;

import org.mapstruct.Mapper;
import org.mapstruct.Mapping;
import org.mapstruct.MappingTarget;

import ma.eniad.userservice.dto.teacher.TeacherExcelRowDTO;
import ma.eniad.userservice.dto.teacher.TeacherRequestDTO;
import ma.eniad.userservice.dto.teacher.TeacherResponseDTO;
import ma.eniad.userservice.entity.Teacher;
import org.mapstruct.BeanMapping;
import org.mapstruct.NullValuePropertyMappingStrategy;

@Mapper(
    componentModel = "spring",
    unmappedTargetPolicy = org.mapstruct.ReportingPolicy.WARN
)
public interface TeacherMapper {
    /**
     * Maps a create request to a new Teacher entity.
     * Security-sensitive and auto-managed fields are explicitly ignored
     * and set manually in the service layer.
     */
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)
    @Mapping(target = "roles",        ignore = true)
    @Mapping(target = "enabled",      ignore = true)
    @Mapping(target = "firstLogin",   ignore = true)
    Teacher toEntity(TeacherRequestDTO request);

    /**
     * Applies an update request onto an existing Teacher entity in-place.
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
    void updateEntity(TeacherRequestDTO request, @MappingTarget Teacher teacher);

    /**
     * Maps a Teacher entity to its response DTO.
     */
    TeacherResponseDTO toResponse(Teacher teacher);

    /**
    * Maps an Excel row to a new Teacher entity.
    * Same security controls as standard create mapping.
    */
    @Mapping(target = "id",           ignore = true)
    @Mapping(target = "pfpUrl",       ignore = true)
    @Mapping(target = "createdAt",    ignore = true)
    @Mapping(target = "updatedAt",    ignore = true)  
    @Mapping(target = "roles",        ignore = true)    
    @Mapping(target = "enabled",      ignore = true)
    @Mapping(target = "firstLogin",   ignore = true)
    Teacher toEntity(TeacherExcelRowDTO excelRow);     
}
