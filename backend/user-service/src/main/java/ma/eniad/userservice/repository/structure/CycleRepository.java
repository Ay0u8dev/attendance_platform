package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Cycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface CycleRepository extends JpaRepository<Cycle, Long> {
    boolean existsByCode(String code);
    Optional<Cycle> findByCode(String code);
}
