package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Formation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FormationRepository extends JpaRepository<Formation, Long> {
    boolean existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(Long anneeUniversitaireId, Long filiereId, Long cycleId);

    @Query("""
            select f from Formation f
            where f.anneeUniversitaire.id = :anneeUniversitaireId
              and (:filiereId is null or f.filiere.id = :filiereId)
              and (:filiereId is not null or f.filiere is null)
              and f.cycle.id = :cycleId
            """)
    Optional<Formation> findSeedFormation(
            @Param("anneeUniversitaireId") Long anneeUniversitaireId,
            @Param("filiereId") Long filiereId,
            @Param("cycleId") Long cycleId
    );
}
