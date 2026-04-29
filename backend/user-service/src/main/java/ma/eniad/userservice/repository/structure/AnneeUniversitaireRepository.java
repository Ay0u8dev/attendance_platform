package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AnneeUniversitaireRepository extends JpaRepository<AnneeUniversitaire, Long> {
    boolean existsByName(String name);
}
