package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.FirebaseToken;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;

/**
 * HU-01: valida el token de Firebase Auth enviado por el frontend, exige correo institucional
 * y carga el perfil (con su rol) desde Firestore.
 */
public class AuthService {

  /** Dominios permitidos. Se puede cambiar con la variable de entorno ALLOWED_DOMAINS. */
  private static final List<String> DOMINIOS = Arrays.stream(
          System.getenv().getOrDefault("ALLOWED_DOMAINS", "javeriana.edu.co").split(","))
      .map(s -> s.trim().toLowerCase(Locale.ROOT))
      .toList();

  public static boolean dominioPermitido(String email) {
    if (email == null) return false;
    String e = email.toLowerCase(Locale.ROOT);
    return DOMINIOS.stream().anyMatch(d -> e.endsWith("@" + d));
  }

  public Usuario autenticar(String authorizationHeader) {
    if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
      throw new ApiException(401, "Debes iniciar sesión");
    }
    FirebaseToken token;
    try {
      Firebase.init();
      token = FirebaseAuth.getInstance().verifyIdToken(authorizationHeader.substring(7));
    } catch (FirebaseAuthException | IllegalArgumentException e) {
      throw new ApiException(401, "Tu sesión no es válida o expiró. Vuelve a iniciar sesión");
    }
    if (!dominioPermitido(token.getEmail())) {
      throw new ApiException(403, "Solo se permiten correos institucionales de la Javeriana");
    }
    DocumentSnapshot perfil = Firebase.await(
        Firebase.db().collection("users").document(token.getUid()).get());
    if (!perfil.exists()) {
      throw new ApiException(403, "Tu cuenta no tiene un perfil asignado en Nexo");
    }
    return Usuario.desde(perfil);
  }
}
