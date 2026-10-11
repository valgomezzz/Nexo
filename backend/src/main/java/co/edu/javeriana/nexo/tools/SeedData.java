package co.edu.javeriana.nexo.tools;

import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.Timestamp;
import com.google.cloud.firestore.Firestore;
import com.google.cloud.firestore.WriteBatch;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseAuthException;
import com.google.firebase.auth.UserRecord;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * Carga usuarios, asignaturas y reportes de prueba en Firebase.
 * Uso (desde la carpeta backend):
 *   $env:GOOGLE_APPLICATION_CREDENTIALS="C:\ruta\serviceAccount.json"
 *   mvn compile exec:java
 * Es idempotente: si un usuario ya existe, lo reutiliza.
 */
public class SeedData {

  static final String CLAVE = System.getenv().getOrDefault("SEED_PASSWORD", "Nexo2026*");

  public static void main(String[] args) throws Exception {
    Firestore db = Firebase.db();
    Timestamp ahora = Timestamp.now();

    String mateo = usuario(db, "mateo.silva@javeriana.edu.co", "Mateo Silva", "ESTUDIANTE", ahora);
    String laura = usuario(db, "laura.diaz@javeriana.edu.co", "Laura Díaz", "ESTUDIANTE", ahora);
    String maria = usuario(db, "maria.garcia@javeriana.edu.co", "María García", "DOCENTE", ahora);
    String andrea = usuario(db, "andrea.ruiz@javeriana.edu.co", "Andrea Ruiz", "DOCENTE", ahora);
    String julian = usuario(db, "julian.torres@javeriana.edu.co", "Julián Torres", "DOCENTE", ahora);
    usuario(db, "ana.torres@javeriana.edu.co", "Ana Torres", "DIRECCION", ahora);

    List<String> est = List.of(mateo, laura);
    asignatura(db, "calculo-g1", "Cálculo Diferencial", "CD", "Grupo 1", andrea, "Andrea Ruiz", est, ahora);
    asignatura(db, "estructuras-g1", "Estructuras de Datos", "ED", "Grupo 1", maria, "María García", est, ahora);
    asignatura(db, "bases-g1", "Bases de Datos I", "BD", "Grupo 1", maria, "María García", est, ahora);
    asignatura(db, "poo-g2", "Programación Orientada a Objetos", "PO", "Grupo 2", julian, "Julián Torres", est, ahora);

    WriteBatch b = db.batch();
    reporte(b, db, "seed-1", laura, "estructuras-g1", "Estructuras de Datos", "Grupo 1", maria, 1, 2, 0, "Ritmo",
        "El ritmo de la clase es muy rápido, no alcanzo a tomar apuntes y los temas de árboles y grafos se acumulan antes del parcial sin práctica suficiente.",
        "PENDIENTE", 2);
    reporte(b, db, "seed-2", laura, "bases-g1", "Bases de Datos I", "Grupo 1", maria, 3, 1, 2, "Contenido",
        "Los ejemplos de normalización vistos en clase no corresponden con los ejercicios propuestos para el taller, y no encuentro el material complementario en la plataforma.",
        "EN_REVISION", 6);
    reporte(b, db, "seed-3", mateo, "calculo-g1", "Cálculo Diferencial", "Grupo 1", andrea, 0, 2, 1, "Metodología",
        "Falta retroalimentación detallada en las tareas entregadas, solo recibimos la nota y así es muy difícil saber qué errores corregir para el siguiente parcial del curso.",
        "ATENDIDO", 12);
    b.commit().get();

    System.out.println("\nDatos de prueba cargados. Contraseña de todos los usuarios: " + CLAVE);
    System.exit(0);
  }

  static String usuario(Firestore db, String email, String nombre, String rol, Timestamp ahora) throws Exception {
    FirebaseAuth auth = FirebaseAuth.getInstance();
    String uid;
    try {
      uid = auth.getUserByEmail(email).getUid();
    } catch (FirebaseAuthException e) {
      uid = auth.createUser(new UserRecord.CreateRequest()
          .setEmail(email).setPassword(CLAVE).setDisplayName(nombre).setEmailVerified(true)).getUid();
    }
    Map<String, Object> d = new HashMap<>();
    d.put("email", email);
    d.put("nombre", nombre);
    d.put("rol", rol);
    d.put("createdAt", ahora);
    d.put("updatedAt", ahora);
    db.collection("users").document(uid).set(d).get();
    System.out.println("Usuario " + rol + ": " + email);
    return uid;
  }

  static void asignatura(Firestore db, String id, String nombre, String ab, String grupo, String profUid,
                         String profNombre, List<String> estudiantes, Timestamp ahora) throws Exception {
    Map<String, Object> d = new HashMap<>();
    d.put("nombre", nombre);
    d.put("abreviatura", ab);
    d.put("grupo", grupo);
    d.put("professorUid", profUid);
    d.put("professorNombre", profNombre);
    d.put("studentUids", estudiantes);
    d.put("createdAt", ahora);
    d.put("updatedAt", ahora);
    db.collection("subjects").document(id).set(d).get();
  }

  static void reporte(WriteBatch b, Firestore db, String id, String est, String subjId, String subjNombre,
                      String grupo, String prof, int met, int con, int rit, String cat, String detalle,
                      String estado, int diasAtras) {
    Instant i = Instant.now().minus(diasAtras, ChronoUnit.DAYS);
    Timestamp t = Timestamp.ofTimeSecondsAndNanos(i.getEpochSecond(), 0);
    Map<String, Object> d = new LinkedHashMap<>();
    d.put("studentUid", est);
    d.put("subjectId", subjId);
    d.put("subjectNombre", subjNombre);
    d.put("grupo", grupo);
    d.put("professorUid", prof);
    d.put("moods", Map.of("metodologia", met, "contenido", con, "ritmo", rit));
    d.put("comentarios", Map.of());
    d.put("categoria", cat);
    d.put("titulo", detalle.substring(0, 60).replaceAll("\\s\\S*$", "") + "…");
    d.put("detalle", detalle);
    d.put("estado", estado);
    d.put("historial", List.of(Map.of("estado", estado, "por", est, "fecha", t)));
    d.put("createdAt", t);
    d.put("updatedAt", t);
    b.set(db.collection("reports").document(id), d);
  }
}
