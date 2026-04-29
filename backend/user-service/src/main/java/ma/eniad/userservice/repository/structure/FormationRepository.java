package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Formation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FormationRepository extends JpaRepository<Formation, Long> {
    boolean existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(Long anneeUniversitaireId, Long filiereId, Long cycleId);
}
