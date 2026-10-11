package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.model.Usuario;
import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import java.util.Arrays;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/** HU-01: Autenticación institucional y gestión de perfiles. */
public class AuthService {

  private static final List<String> DOMINIOS = Arrays.stream(
          System.getenv().getOrDefault("ALLOWED_DOMAINS", "javeriana.edu.co").split(","))
      .map(s -> s.trim().toLowerCase(Locale.ROOT))
      .toList();

  private static final Map<String, Usuario> CUENTAS_DEMO = Map.of(
      "estudiante@javeriana.edu.co", new Usuario("demo-est-01", "estudiante@javeriana.edu.co", "Ana María Ruiz", Rol.ESTUDIANTE),
      "profesor@javeriana.edu.co", new Usuario("demo-doc-01", "profesor@javeriana.edu.co", "Dr. Carlos Mendoza", Rol.DOCENTE),
      "direccion@javeriana.edu.co", new Usuario("demo-dir-01", "direccion@javeriana.edu.co", "Dra. Elena Gómez", Rol.DIRECCION)
  );

  public static boolean dominioPermitido(String email) {
    if (email == null) return false;
    String e = email.toLowerCase(Locale.ROOT).trim();
    return DOMINIOS.stream().anyMatch(d -> e.endsWith("@" + d));
  }

  public Usuario autenticar(String authHeader) {
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      // Si no hay token, retorna el estudiante por defecto para navegación fluida
      return CUENTAS_DEMO.get("estudiante@javeriana.edu.co");
    }

    String tokenStr = authHeader.substring(7).trim();

    // Si coincide con un usuario demo o token mock
    if (CUENTAS_DEMO.containsKey(tokenStr)) {
      return CUENTAS_DEMO.get(tokenStr);
    }
    for (Usuario u : CUENTAS_DEMO.values()) {
      if (u.uid().equals(tokenStr) || u.email().equalsIgnoreCase(tokenStr)) return u;
    }

    // Si Firebase Cloud está activo, verificar token real
    if (Firebase.isCloudActive()) {
      try {
        FirebaseToken token = FirebaseAuth.getInstance().verifyIdToken(tokenStr);
        if (!dominioPermitido(token.getEmail())) {
          throw new ApiException(403, "Solo se permiten correos institucionales (@javeriana.edu.co)");
        }
        DocumentSnapshot perfil = Firebase.await(
            Firebase.db().collection("users").document(token.getUid()).get());
        if (perfil.exists()) {
          return Usuario.desde(perfil);
        }
        // Perfil por defecto inferido del token
        return new Usuario(token.getUid(), token.getEmail(),
            token.getName() != null ? token.getName() : "Usuario Javeriana",
            Rol.ESTUDIANTE);
      } catch (Exception e) {
        throw new ApiException(401, "Sesión no válida o expirada: " + e.getMessage());
      }
    }

    return CUENTAS_DEMO.get("estudiante@javeriana.edu.co");
  }

  public Usuario loginDirecto(String email, String password, String requestedRole) {
    String cleanEmail = (email != null ? email.trim().toLowerCase(Locale.ROOT) : "");
    if (!dominioPermitido(cleanEmail)) {
      throw new ApiException(400, "El correo debe pertenecer al dominio institucional (@javeriana.edu.co)");
    }
    if (password == null || password.length() < 4) {
      throw new ApiException(400, "La contraseña debe tener al menos 4 caracteres");
    }

    if (CUENTAS_DEMO.containsKey(cleanEmail)) {
      Usuario base = CUENTAS_DEMO.get(cleanEmail);
      if (requestedRole != null && !requestedRole.isBlank()) {
        return new Usuario(base.uid(), base.email(), base.nombre(), Rol.desdeCodigo(requestedRole));
      }
      return base;
    }

    String[] parts = cleanEmail.split("@")[0].split("\\.");
    StringBuilder nameBuilder = new StringBuilder();
    for (String p : parts) {
      if (!p.isEmpty()) {
        nameBuilder.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(" ");
      }
    }
    String name = nameBuilder.toString().trim();
    return new Usuario("usr-" + parts[0], cleanEmail, name.isEmpty() ? "Usuario" : name, Rol.desdeCodigo(requestedRole));
  }
}
