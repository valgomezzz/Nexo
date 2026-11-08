package co.edu.javeriana.nexo;

import co.edu.javeriana.nexo.model.Rol;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.SetOptions;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.UserRecord;
import java.util.Map;

/**
 * Utilidad de administración: asigna el rol de un usuario existente en Firebase Auth.
 * Las reglas de Firestore impiden que un usuario cambie su propio rol, así que
 * DOCENTE / DIRECCION / ADMIN se asignan aquí con el Admin SDK.
 *
 * Uso (desde backend/):
 *   mvn compile exec:java -Dexec.mainClass=co.edu.javeriana.nexo.AsignarRol -Dexec.args="profesor@javeriana.edu.co DOCENTE"
 */
public class AsignarRol {

  public static void main(String[] args) throws Exception {
    if (args.length != 2) {
      System.err.println("Uso: AsignarRol <correo> <ESTUDIANTE|DOCENTE|DIRECCION|ADMIN>");
      System.exit(1);
    }

    Firebase.init();
    if (!Firebase.isCloudActive()) {
      System.err.println("Firebase Cloud no está activo: falta backend/serviceAccountKey.json");
      System.exit(1);
    }

    String email = args[0].trim().toLowerCase();
    Rol rol = Rol.valueOf(args[1].trim().toUpperCase());

    UserRecord user = FirebaseAuth.getInstance().getUserByEmail(email);
    Firebase.await(Firebase.db().collection("users").document(user.getUid())
        .set(Map.of("email", email, "rol", rol.name()), SetOptions.merge()));

    System.out.println("Rol " + rol.name() + " asignado a " + email + " (uid " + user.getUid() + ")");
    System.exit(0);
  }
}
