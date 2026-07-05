package ma.eniad.userservice.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;
import ma.eniad.userservice.entity.structure.Module;

@Entity
@Getter
@Setter
@NoArgsConstructor
@Table(
    name = "teacher_assignments",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_teacher_assignment",
        columnNames = {"teacher_id", "academic_year_id", "formation_id", "groupe_id", "module_id"}
    ),
    indexes = {
        @Index(name = "idx_teacher_assignments_teacher", columnList = "teacher_id"),
        @Index(name = "idx_teacher_assignments_year", columnList = "academic_year_id")
    }
)
public class TeacherAssignment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "teacher_id", nullable = false)
    private Teacher teacher;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "academic_year_id", nullable = false)
    private AnneeUniversitaire academicYear;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "formation_id", nullable = false)
    private Formation formation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "groupe_id", nullable = false)
    private Groupe groupe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "module_id", nullable = false)
    private Module module;
}
