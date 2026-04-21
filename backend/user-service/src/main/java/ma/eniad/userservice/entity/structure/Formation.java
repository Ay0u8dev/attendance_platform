package ma.eniad.userservice.entity.structure;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "formations")
public class Formation {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "annee_univ_id")
    private AnneeUniversitaire anneeUniversitaire;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "filliere_id")
    private Filliere filliere;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "cycle_id")
    private Cycle cycle;
}