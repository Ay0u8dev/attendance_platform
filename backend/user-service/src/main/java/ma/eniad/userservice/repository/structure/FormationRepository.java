package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Formation;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface FormationRepository extends JpaRepository<Formation, Long> {
    boolean existsByAnneeUniversitaireIdAndCycleIdAndName(Long anneeUniversitaireId, Long cycleId, String name);
    boolean existsByAnneeUniversitaireIdAndCycleIdAndNameAndIdNot(
            Long anneeUniversitaireId,
            Long cycleId,
            String name,
            Long id
    );
    List<Formation> findByNameIn(Set<String> names);
}
