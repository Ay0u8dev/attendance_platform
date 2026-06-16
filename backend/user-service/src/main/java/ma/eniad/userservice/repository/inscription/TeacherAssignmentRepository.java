package ma.eniad.userservice.repository.inscription;

import java.util.List;
import java.util.Optional;
import java.util.Set;

import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import ma.eniad.userservice.entity.TeacherAssignment;

@Repository
public interface TeacherAssignmentRepository extends JpaRepository<TeacherAssignment, Long> {
    boolean existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleId(
        Long teacherId,
        Long academicYearId,
        Long formationId,
        Long groupeId,
        Long moduleId
    );

    boolean existsByTeacherIdAndAcademicYearIdAndFormationIdAndGroupeIdAndModuleIdAndIdNot(
        Long teacherId,
        Long academicYearId,
        Long formationId,
        Long groupeId,
        Long moduleId,
        Long id
    );

    @Override
    @EntityGraph(attributePaths = {"teacher", "academicYear", "formation", "groupe", "module"})
    Optional<TeacherAssignment> findById(Long id);

    @Override
    @EntityGraph(attributePaths = {"teacher", "academicYear", "formation", "groupe", "module"})
    List<TeacherAssignment> findAll();

    @Query("select a.teacher.id, a.academicYear.id, a.formation.id, a.groupe.id, a.module.id "
        + "from TeacherAssignment a "
        + "where a.teacher.id in :teacherIds "
        + "and a.academicYear.id in :yearIds "
        + "and a.formation.id in :formationIds "
        + "and a.groupe.id in :groupeIds "
        + "and a.module.id in :moduleIds")
    List<Object[]> findExistingAssignmentKeys(
        @Param("teacherIds") Set<Long> teacherIds,
        @Param("yearIds") Set<Long> yearIds,
        @Param("formationIds") Set<Long> formationIds,
        @Param("groupeIds") Set<Long> groupeIds,
        @Param("moduleIds") Set<Long> moduleIds
    );
}
