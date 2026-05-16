package ma.eniad.userservice.entity.structure;


import java.util.List;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import lombok.experimental.SuperBuilder;
import ma.eniad.userservice.entity.BaseEntity;
import ma.eniad.userservice.entity.Inscription;

@Getter
@Setter
@Entity
@SuperBuilder
@NoArgsConstructor(access = AccessLevel.PROTECTED)
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
public class Formation extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "annee_univ_id", nullable = false)
    private AnneeUniversitaire anneeUniversitaire;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "filiere_id", nullable = true)
    private Filiere filiere;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    private Cycle cycle;

    @OneToMany(mappedBy = "formation", cascade = CascadeType.REMOVE)
    private List<Groupe> groupes;

    @OneToMany(mappedBy = "formation", cascade = CascadeType.REMOVE)
    private List<Module> modules;

    @OneToMany(mappedBy = "formation", cascade = CascadeType.REMOVE)
    private List<Inscription> inscriptions;
}
