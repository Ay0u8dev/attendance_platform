package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    boolean existsByFormationIdAndCode(Long formationId, String code);
    Optional<Module> findByFormationIdAndCode(Long formationId, String code);
}
