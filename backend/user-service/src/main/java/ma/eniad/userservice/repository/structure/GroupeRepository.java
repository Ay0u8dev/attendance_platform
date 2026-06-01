package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Groupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {
    boolean existsByFormationIdAndName(Long formationId, String name);
    Optional<Groupe> findByFormationIdAndName(Long formationId, String name);
}
