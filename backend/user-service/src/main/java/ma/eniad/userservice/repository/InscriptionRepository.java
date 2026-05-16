package ma.eniad.userservice.repository;

import ma.eniad.userservice.entity.Inscription;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface InscriptionRepository extends JpaRepository<Inscription, Long> {
    @Query("select i from Inscription i " +
            "where i.groupe.id in :groupIds and i.anneeUniversitaire.id = :anneeUniversitaireId")
    List<Inscription> findRosterByGroupIdsAndAnneeUniversitaireId(
            @Param("groupIds") List<Long> groupIds,
            @Param("anneeUniversitaireId") Long anneeUniversitaireId
    );
    
    boolean existsByStudentIdAndAnneeUniversitaireId(Long studentId, Long anneeId);
}
