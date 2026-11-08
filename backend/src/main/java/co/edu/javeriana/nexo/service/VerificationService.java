package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.support.ApiException;
import co.edu.javeriana.nexo.support.Firebase;
import com.google.cloud.firestore.DocumentReference;
import com.google.cloud.firestore.DocumentSnapshot;
import com.google.cloud.firestore.FieldValue;
import com.google.cloud.firestore.Firestore;
import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseToken;
import com.google.firebase.auth.UserRecord;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

/**
 * Registro con verificación del correo institucional mediante un código de 6 dígitos.
 *
 * Flujo:
 *   1. El cliente crea la cuenta en Firebase Authentication (queda sin verificar).
 *   2. POST /api/auth/verification/send  (Bearer ID token)  → se envía el código al correo.
 *   3. POST /api/auth/verification/confirm {code}            → se marca emailVerified=true y
 *      se crea el perfil como ESTUDIANTE.
 *
 * Los códigos se guardan con hash en Firestore (emailCodes/{uid}); las reglas de Firestore
 * no permiten que ningún cliente lea ni escriba esa colección.
 */
public class VerificationService {

  public static final int MINUTOS_VALIDEZ = 10;
  private static final long VALIDEZ_MS = MINUTOS_VALIDEZ * 60_000L;
  private static final long ESPERA_REENVIO_MS = 60_000L;
  private static final long VENTANA_ENVIOS_MS = 60 * 60_000L;
  private static final int MAX_ENVIOS_POR_HORA = 5;
  private static final int MAX_INTENTOS = 5;

  private static final SecureRandom RANDOM = new SecureRandom();

  private final MailService mail = new MailService();

  private record Sesion(String uid, String email) {}

  // -------------------------------------------------------------
  // Envío del código
  // -------------------------------------------------------------
  public Map<String, Object> enviar(String authHeader, String nombre) {
    Sesion s = sesion(authHeader);
    if (yaVerificado(s.uid())) {
      asegurarPerfil(s, nombre);
      return Map.of("verified", true);
    }

    Firestore db = Firebase.db();
    DocumentReference ref = db.collection("emailCodes").document(s.uid());
    String codigo = String.format("%06d", RANDOM.nextInt(1_000_000));
    long ahora = System.currentTimeMillis();
    String nombreLimpio = limpiarNombre(nombre);

    Firebase.await(db.runTransaction(tx -> {
      DocumentSnapshot d = tx.get(ref).get();
      long enviado = num(d, "sentAt");
      long ventana = num(d, "windowStart");
      long envios = num(d, "sends");

      long falta = enviado + ESPERA_REENVIO_MS - ahora;
      if (falta > 0) {
        throw new ApiException(429, "Espera " + ((falta + 999) / 1000) + " s antes de pedir otro código.");
      }
      if (ahora - ventana > VENTANA_ENVIOS_MS) {
        ventana = ahora;
        envios = 0;
      }
      if (envios >= MAX_ENVIOS_POR_HORA) {
        throw new ApiException(429, "Pediste demasiados códigos. Inténtalo de nuevo en una hora.");
      }

      Map<String, Object> data = new LinkedHashMap<>();
      data.put("email", s.email());
      data.put("hash", hash(s.uid(), codigo));
      data.put("expiresAt", ahora + VALIDEZ_MS);
      data.put("attempts", 0);
      data.put("sentAt", ahora);
      data.put("windowStart", ventana);
      data.put("sends", envios + 1);
      String previo = d.exists() ? d.getString("nombre") : null;
      data.put("nombre", nombreLimpio != null ? nombreLimpio : previo);
      tx.set(ref, data);
      return null;
    }));

    try {
      mail.enviarCodigo(s.email(), codigo, MINUTOS_VALIDEZ);
    } catch (ApiException e) {
      // Si el correo falla, se permite reintentar de inmediato
      Firebase.await(ref.update("sentAt", 0L));
      throw e;
    }

    Map<String, Object> resp = new LinkedHashMap<>();
    resp.put("sent", true);
    resp.put("email", s.email());
    resp.put("cooldown", ESPERA_REENVIO_MS / 1000);
    resp.put("expiresIn", VALIDEZ_MS / 1000);
    return resp;
  }

  // -------------------------------------------------------------
  // Confirmación del código
  // -------------------------------------------------------------
  public Map<String, Object> confirmar(String authHeader, String codigo) {
    Sesion s = sesion(authHeader);
    if (yaVerificado(s.uid())) {
      asegurarPerfil(s, null);
      return Map.of("verified", true);
    }

    String limpio = codigo == null ? "" : codigo.replaceAll("\\D", "");
    if (limpio.length() != 6) throw new ApiException(400, "El código tiene 6 dígitos.");

    Firestore db = Firebase.db();
    DocumentReference ref = db.collection("emailCodes").document(s.uid());
    long ahora = System.currentTimeMillis();

    // La transacción devuelve el resultado en lugar de lanzar la excepción, para que
    // el aumento del contador de intentos sí quede guardado.
    Object[] r = Firebase.await(db.runTransaction(tx -> {
      DocumentSnapshot d = tx.get(ref).get();
      if (!d.exists() || d.getString("hash") == null) return new Object[] {"none", null};
      if (num(d, "expiresAt") < ahora) return new Object[] {"expired", null};
      long intentos = num(d, "attempts");
      if (intentos >= MAX_INTENTOS) return new Object[] {"locked", null};

      boolean ok = MessageDigest.isEqual(
          hash(s.uid(), limpio).getBytes(StandardCharsets.UTF_8),
          d.getString("hash").getBytes(StandardCharsets.UTF_8));
      if (!ok) {
        tx.update(ref, "attempts", intentos + 1);
        return new Object[] {"wrong", MAX_INTENTOS - intentos - 1};
      }
      tx.delete(ref);
      return new Object[] {"ok", d.getString("nombre")};
    }));

    switch ((String) r[0]) {
      case "none" -> throw new ApiException(400, "No hay un código activo. Pide uno nuevo.");
      case "expired" -> throw new ApiException(400, "El código venció. Pide uno nuevo.");
      case "locked" -> throw new ApiException(429, "Demasiados intentos fallidos. Pide un código nuevo.");
      case "wrong" -> {
        long quedan = ((Number) r[1]).longValue();
        throw new ApiException(400, quedan > 0
            ? "Código incorrecto. Te quedan " + quedan + " intento" + (quedan == 1 ? "" : "s") + "."
            : "Código incorrecto. Pide un código nuevo.");
      }
      default -> { }
    }

    try {
      FirebaseAuth.getInstance().updateUser(new UserRecord.UpdateRequest(s.uid()).setEmailVerified(true));
    } catch (Exception e) {
      throw new ApiException(500, "No fue posible marcar el correo como verificado: " + e.getMessage());
    }
    asegurarPerfil(s, (String) r[1]);
    return Map.of("verified", true);
  }

  // -------------------------------------------------------------
  // Auxiliares
  // -------------------------------------------------------------
  private Sesion sesion(String authHeader) {
    if (!Firebase.isCloudActive()) {
      throw new ApiException(503, "La verificación por correo requiere el backend conectado a Firebase (serviceAccountKey.json).");
    }
    if (authHeader == null || !authHeader.startsWith("Bearer ")) {
      throw new ApiException(401, "Falta el token de sesión.");
    }
    FirebaseToken token;
    try {
      token = FirebaseAuth.getInstance().verifyIdToken(authHeader.substring(7).trim());
    } catch (Exception e) {
      throw new ApiException(401, "Sesión no válida o expirada.");
    }
    String email = token.getEmail() == null ? "" : token.getEmail().toLowerCase(Locale.ROOT);
    if (!AuthService.dominioPermitido(email)) {
      throw new ApiException(403, "Solo se permiten correos institucionales (@javeriana.edu.co).");
    }
    return new Sesion(token.getUid(), email);
  }

  private boolean yaVerificado(String uid) {
    try {
      return FirebaseAuth.getInstance().getUser(uid).isEmailVerified();
    } catch (Exception e) {
      throw new ApiException(401, "La cuenta no existe en Firebase Authentication.");
    }
  }

  /** Crea el perfil como ESTUDIANTE si aún no existe (nunca cambia un rol existente). */
  private void asegurarPerfil(Sesion s, String nombre) {
    DocumentReference ref = Firebase.db().collection("users").document(s.uid());
    DocumentSnapshot d = Firebase.await(ref.get());
    if (d.exists()) return;
    Map<String, Object> perfil = new LinkedHashMap<>();
    perfil.put("email", s.email());
    perfil.put("nombre", nombre != null ? nombre : nombreDesdeCorreo(s.email()));
    perfil.put("rol", "ESTUDIANTE");
    perfil.put("createdAt", FieldValue.serverTimestamp());
    Firebase.await(ref.set(perfil));
  }

  private static String limpiarNombre(String n) {
    if (n == null) return null;
    String t = n.replaceAll("[\\p{Cntrl}<>]", "").trim().replaceAll("\\s+", " ");
    if (t.isEmpty()) return null;
    return t.length() > 80 ? t.substring(0, 80) : t;
  }

  private static String nombreDesdeCorreo(String email) {
    StringBuilder sb = new StringBuilder();
    for (String p : email.split("@")[0].split("[._-]")) {
      if (!p.isEmpty()) sb.append(Character.toUpperCase(p.charAt(0))).append(p.substring(1)).append(' ');
    }
    String r = sb.toString().trim();
    return r.isEmpty() ? "Usuario Javeriana" : r;
  }

  private static long num(DocumentSnapshot d, String campo) {
    if (!d.exists()) return 0;
    Object v = d.get(campo);
    return v instanceof Number n ? n.longValue() : 0;
  }

  private static String hash(String uid, String codigo) {
    try {
      MessageDigest md = MessageDigest.getInstance("SHA-256");
      return HexFormat.of().formatHex(md.digest((uid + ":" + codigo).getBytes(StandardCharsets.UTF_8)));
    } catch (Exception e) {
      throw new IllegalStateException(e);
    }
  }
}
