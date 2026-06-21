package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Filiere;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface FiliereRepository extends JpaRepository<Filiere, Long> {
    boolean existsByCode(String code);
    Optional<Filiere> findByCode(String code);
}
