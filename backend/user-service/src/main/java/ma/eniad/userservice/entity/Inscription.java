package ma.eniad.userservice.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.ForeignKey;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Formation;
import ma.eniad.userservice.entity.structure.Groupe;

@Getter
@Setter
@Entity
@Table(
        name = "inscriptions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_inscription_student_group_year",
                columnNames = {"student_id", "groupe_id", "annee_univ_id"}
        ),
        indexes = {
                @Index(name = "idx_inscriptions_student_id", columnList = "student_id"),
                @Index(name = "idx_inscriptions_groupe_id", columnList = "groupe_id"),
                @Index(name = "idx_inscriptions_annee_univ_id", columnList = "annee_univ_id")
        }
)
public class Inscription extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "groupe_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_inscription_groupe")
    )
    private Groupe groupe;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "formation_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_inscription_formation")
    )
    private Formation formation;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(
            name = "annee_univ_id",
            nullable = false,
            foreignKey = @ForeignKey(name = "fk_inscription_annee_univ")
    )
    private AnneeUniversitaire anneeUniversitaire;
}