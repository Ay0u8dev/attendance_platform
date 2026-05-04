package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Cycle;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface CycleRepository extends JpaRepository<Cycle, Long> {
    boolean existsByCode(String code);
}
