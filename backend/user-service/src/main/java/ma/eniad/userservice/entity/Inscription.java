package ma.eniad.userservice.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.entity.structure.Groupe;

@Getter
@Setter
@Entity
@Table(name = "inscriptions")
public class Inscription {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "student_id")
    private Student student;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "groupe_id")
    private Groupe groupe;

    @ManyToOne(cascade = CascadeType.DETACH)
    @JoinColumn(name = "annee_univ_id")
    private AnneeUniversitaire anneeUniversitaire;
}