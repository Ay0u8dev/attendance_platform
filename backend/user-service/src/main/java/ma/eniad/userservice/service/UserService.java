package ma.eniad.userservice.service;

import lombok.RequiredArgsConstructor;
import ma.eniad.userservice.dto.AuthUserRequest;
import ma.eniad.userservice.dto.InternalTeacherIdentityDto;
import ma.eniad.userservice.dto.StudentRosterDto;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.entity.Inscription;
import ma.eniad.userservice.entity.Teacher;
import ma.eniad.userservice.entity.User;
import ma.eniad.userservice.entity.structure.AnneeUniversitaire;
import ma.eniad.userservice.repository.InscriptionRepository;
import ma.eniad.userservice.repository.UserRepository;
import ma.eniad.userservice.repository.teacher.TeacherRepository;
import ma.eniad.userservice.repository.structure.AnneeUniversitaireRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final TeacherRepository teacherRepository;
    private final InscriptionRepository inscriptionRepository;
    private final AnneeUniversitaireRepository anneeUniversitaireRepository;

    public UserResponseDto findUser(AuthUserRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (user.isFirstLogin()) {
            user.setFirstLogin(false);
            user.setPfpUrl(request.getPfpUrl());
            user = userRepository.save(user);
        }

        return UserResponseDto.builder()
                .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pfpUrl(user.getPfpUrl())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .firstLogin(user.isFirstLogin())
                .build();
    }


    public UserResponseDto findById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));

        return UserResponseDto.builder()
            .id(user.getId())
                .email(user.getEmail())
                .firstName(user.getFirstName())
                .lastName(user.getLastName())
                .pfpUrl(user.getPfpUrl())
                .roles(user.getRoles().stream().map(Enum::name).toList())
                .enabled(user.isEnabled())
                .firstLogin(user.isFirstLogin())
                .build();
    }

    public List<StudentRosterDto> getStudentRosterByGroupIds(List<Long> groupIds) {
        List<AnneeUniversitaire> activeYears = anneeUniversitaireRepository.findByActiveTrue();

        if (activeYears.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "No active academic year found");
        }

        if (activeYears.size() > 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Multiple active academic years found");
        }

        Long activeYearId = activeYears.get(0).getId();
        List<Inscription> inscriptions =
                inscriptionRepository.findRosterByGroupIdsAndAnneeUniversitaireId(groupIds, activeYearId);

        return inscriptions.stream()
                .filter(inscription -> inscription.getStudent() != null)
                .map(inscription -> new StudentRosterDto(
                        inscription.getStudent().getId(),
                        inscription.getGroupe().getId(),
                        inscription.getStudent().getFirstName(),
                        inscription.getStudent().getLastName(),
                        inscription.getStudent().getEmail(),
                        inscription.getStudent().getPfpUrl(),
                        inscription.getStudent().getNumApogee()
                ))
                .toList();
    }

    public InternalTeacherIdentityDto getTeacherIdentityById(Long teacherId) {
        Teacher teacher = teacherRepository.findById(teacherId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Teacher not found"));

        return new InternalTeacherIdentityDto(
                teacher.getId(),
                teacher.getFirstName(),
                teacher.getLastName()
        );
    }
}
