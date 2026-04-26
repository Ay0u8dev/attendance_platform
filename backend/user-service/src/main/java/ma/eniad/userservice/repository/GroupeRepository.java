package ma.eniad.userservice.repository;

import ma.eniad.userservice.entity.structure.Groupe;
import org.springframework.data.jpa.repository.JpaRepository;

public interface GroupeRepository extends JpaRepository<Groupe, Long> {
}
