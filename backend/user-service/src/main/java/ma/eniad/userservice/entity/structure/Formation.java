package ma.eniad.userservice.entity.structure;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.BaseEntity;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

@Getter
@Setter
@Entity
@Table(
    name = "formations",
    uniqueConstraints = @UniqueConstraint(
        name = "uk_formations_year_filiere_cycle",
        columnNames = {"annee_univ_id", "filiere_id", "cycle_id"}
    ),
    indexes = {
        @Index(name = "idx_formations_annee_univ", columnList = "annee_univ_id"),
        @Index(name = "idx_formations_filiere", columnList = "filiere_id"),
        @Index(name = "idx_formations_cycle", columnList = "cycle_id")
    }
)
@SQLDelete(sql = "UPDATE formations SET deleted = true WHERE id = ?")
@SQLRestriction("deleted = false")
public class Formation extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annee_univ_id", nullable = false)
    private AnneeUniversitaire anneeUniversitaire;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "filiere_id", nullable = false)
    private Filiere filiere;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private Cycle cycle;
}