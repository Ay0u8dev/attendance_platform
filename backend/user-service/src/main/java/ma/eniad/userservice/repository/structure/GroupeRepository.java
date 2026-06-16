package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Groupe;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Set;

@Repository
public interface GroupeRepository extends JpaRepository<Groupe, Long> {
    boolean existsByFormationIdAndName(Long formationId, String name);
    List<Groupe> findByNameIn(Set<String> names);
}
