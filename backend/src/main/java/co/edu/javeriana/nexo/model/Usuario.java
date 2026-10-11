package co.edu.javeriana.nexo.model;

import com.google.cloud.firestore.DocumentSnapshot;
import java.util.LinkedHashMap;
import java.util.Map;

/** Perfil de usuario institucional (HU-01 y HU-05). */
public record Usuario(String uid, String email, String nombre, Rol rol) {

  public static Usuario desde(DocumentSnapshot d) {
    String rolStr = d.getString("rol");
    Rol r = Rol.desdeCodigo(rolStr != null ? rolStr : "ESTUDIANTE");
    return new Usuario(d.getId(), d.getString("email"), d.getString("nombre"), r);
  }

  public Map<String, Object> toJson() {
    String[] partes = nombre == null ? new String[] {""} : nombre.trim().split("\\s+");
    String primerNombre = partes[0].isEmpty() ? "Usuario" : partes[0];
    String iniciales = partes.length > 1
        ? ("" + partes[0].charAt(0) + partes[1].charAt(0))
        : primerNombre.substring(0, Math.min(2, primerNombre.length()));

    Map<String, Object> m = new LinkedHashMap<>();
    m.put("uid", uid);
    m.put("email", email);
    m.put("nombre", nombre);
    m.put("primerNombre", primerNombre);
    m.put("iniciales", iniciales.toUpperCase());
    m.put("rol", rol.codigo());
    return m;
  }
}
