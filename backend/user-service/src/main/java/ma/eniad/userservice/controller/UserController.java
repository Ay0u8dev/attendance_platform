package ma.eniad.userservice.controller;

import ma.eniad.userservice.dto.FindOrCreateUserRequest;
import ma.eniad.userservice.dto.UserResponseDto;
import ma.eniad.userservice.service.UserService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private UserService userService;

    @PostMapping("/find-or-create")
    public UserResponseDto findOrCreate(@RequestBody FindOrCreateUserRequest request) {
        String email = request.getEmail();
        if (email == null || email.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Email is required");
        }

        return userService.findOrCreateUser(request);
    }


//    @GetMapping
//    public List<User> findAll() {
//        return userRepository.findAll();
//    }
//
//    @GetMapping("/{id}")
//    public User findById(Long id) {
//        return userRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
//    }
//
//    @PostMapping
//    public User save(@RequestBody User user) {
//        return userRepository.save(user);
//    }

//    @PutMapping("/{id}")
//    public User update(@PathVariable Long id, @RequestBody User user) {
//        User existingUser = userRepository.findById(id)
//                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
//
//        existingUser.setUsername(user.getUsername());
//        existingUser.setFirstName(user.getFirstName());
//        existingUser.setLastName(user.getLastName());
//        existingUser.setPictureUrl(user.getPictureUrl());
//
//        return userRepository.save(existingUser);
//    }

}
