package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Formation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface FormationRepository extends JpaRepository<Formation, Long> {
    boolean existsByName(String name);
    boolean existsByAnneeUniversitaireIdAndFiliereIdAndCycleId(Long anneeUniversitaireId, Long filiereId, Long cycleId);
    List<Formation> findByNameIn(Set<String> names);
}
