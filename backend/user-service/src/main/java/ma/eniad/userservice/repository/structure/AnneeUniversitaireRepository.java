package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.Set;

@Repository
public interface AnneeUniversitaireRepository extends JpaRepository<AnneeUniversitaire, Long> {
    boolean existsByName(String name);
    Optional<AnneeUniversitaire> findByName(String name);
    List<AnneeUniversitaire> findByActiveTrue();
    List<AnneeUniversitaire> findByNameIn(Set<String> names);

    @Modifying
    @Query("update AnneeUniversitaire a set a.active = false " +
            "where a.active = true and (:currentId is null or a.id <> :currentId)")
    void deactivateOtherActiveYears(@Param("currentId") Long currentId);
}
