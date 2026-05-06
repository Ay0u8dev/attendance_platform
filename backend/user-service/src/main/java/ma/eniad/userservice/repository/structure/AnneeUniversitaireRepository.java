package ma.eniad.userservice.repository.structure;

import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface AnneeUniversitaireRepository extends JpaRepository<AnneeUniversitaire, Long> {
    boolean existsByName(String name);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query("update AnneeUniversitaire annee "
            + "set annee.active = false "
            + "where annee.active = true "
            + "and annee.deleted = false "
            + "and (:currentId is null or annee.id <> :currentId)")
    int deactivateOtherActiveYears(@Param("currentId") Long currentId);
}
