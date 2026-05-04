package ma.eniad.userservice.repository;

import ma.eniad.userservice.entity.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface InscriptionRepository extends JpaRepository<Inscription, Long> {

    @Query("""
            select i
            from Inscription i
            join fetch i.student s
            join fetch i.groupe g
            where g.id in :groupIds
              and i.anneeUniversitaire.id = :anneeUniversitaireId
            """)
    List<Inscription> findRosterByGroupIdsAndAnneeUniversitaireId(List<Long> groupIds, Long anneeUniversitaireId);
}
