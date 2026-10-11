package co.edu.javeriana.nexo.model;

import com.google.cloud.firestore.DocumentSnapshot;
import java.util.LinkedHashMap;
import java.util.Map;

/** Perfil guardado en la colección "users" (el id del documento es el uid de Firebase Auth). */
public record Usuario(String uid, String email, String nombre, Rol rol) {

  public static Usuario desde(DocumentSnapshot d) {
    return new Usuario(d.getId(), d.getString("email"), d.getString("nombre"),
        Rol.valueOf(d.getString("rol")));
  }

  public Map<String, Object> toJson() {
    String[] partes = nombre == null ? new String[] {""} : nombre.trim().split("\\s+");
    String iniciales = partes.length > 1
        ? ("" + partes[0].charAt(0) + partes[1].charAt(0))
        : partes[0].isEmpty() ? "?" : partes[0].substring(0, 1);
    Map<String, Object> m = new LinkedHashMap<>();
    m.put("uid", uid);
    m.put("email", email);
    m.put("nombre", nombre);
    m.put("primerNombre", partes[0]);
    m.put("iniciales", iniciales.toUpperCase());
    m.put("rol", rol.codigo());
    return m;
  }
}
