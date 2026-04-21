package ma.eniad.userservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Groupe;

@Getter
@Setter
@Entity
@Table(
        name = "inscriptions",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_inscription_student_group_year",
                columnNames = {"student_id", "groupe_id", "annee_univ_id"}
        )
)
public class Inscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(cascade = CascadeType.DETACH, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(cascade = CascadeType.DETACH, optional = false)
    @JoinColumn(name = "groupe_id", nullable = false)
    private Groupe groupe;

    @ManyToOne(cascade = CascadeType.DETACH, optional = false)
    @JoinColumn(name = "annee_univ_id", nullable = false)
    private AnneeUniversitaire anneeUniversitaire;
}