package co.edu.javeriana.nexo.service;

import co.edu.javeriana.nexo.support.ApiException;
import jakarta.mail.Authenticator;
import jakarta.mail.Message;
import jakarta.mail.PasswordAuthentication;
import jakarta.mail.Session;
import jakarta.mail.Transport;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import jakarta.mail.internet.MimeMultipart;
import jakarta.mail.internet.MimeBodyPart;
import java.nio.charset.StandardCharsets;
import java.util.Properties;
import java.util.logging.Logger;

/**
 * Envío de correos por SMTP. Se configura con variables de entorno:
 *   SMTP_HOST (p. ej. smtp.gmail.com), SMTP_PORT (587), SMTP_USER, SMTP_PASS, SMTP_FROM (opcional)
 *
 * Sin SMTP_HOST el correo no se envía: el código se imprime en la consola del backend
 * para poder probar el registro en desarrollo.
 */
public class MailService {

  private static final Logger LOG = Logger.getLogger(MailService.class.getName());

  private final String host = env("SMTP_HOST");
  private final String port = env("SMTP_PORT") != null ? env("SMTP_PORT") : "587";
  private final String user = env("SMTP_USER");
  private final String pass = env("SMTP_PASS");
  private final String from = env("SMTP_FROM") != null ? env("SMTP_FROM") : env("SMTP_USER");

  private static String env(String k) {
    String v = System.getenv(k);
    return v == null || v.isBlank() ? null : v.trim();
  }

  public boolean configurado() {
    return host != null;
  }

  public void enviarCodigo(String destino, String codigo, int minutos) {
    String asunto = "Nexo · Tu código de verificación es " + codigo;
    String texto = "Hola,\n\nTu código para verificar tu cuenta de Nexo es: " + codigo
        + "\n\nVence en " + minutos + " minutos. Si no fuiste tú, ignora este correo.\n\nNexo · Pontificia Universidad Javeriana";
    String html = """
        <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:24px;color:#132135">
          <h2 style="color:#355E96;margin:0 0 12px">Verifica tu cuenta de Nexo</h2>
          <p>Escribe este código en la pantalla de verificación:</p>
          <p style="font-size:34px;font-weight:700;letter-spacing:8px;background:#EEF3FA;border-radius:12px;padding:16px;text-align:center;margin:20px 0">%s</p>
          <p style="color:#5B6B82;font-size:14px">Vence en %d minutos. Si no fuiste tú, ignora este correo.</p>
          <p style="color:#5B6B82;font-size:13px;margin-top:24px">Nexo · Pontificia Universidad Javeriana</p>
        </div>""".formatted(codigo, minutos);

    if (!configurado()) {
      LOG.warning("[Mail] SMTP_HOST no configurado. Código para " + destino + ": " + codigo);
      System.out.println("  ✉️  Código de verificación para " + destino + ": " + codigo);
      return;
    }

    Properties p = new Properties();
    p.put("mail.smtp.host", host);
    p.put("mail.smtp.port", port);
    p.put("mail.smtp.auth", String.valueOf(user != null));
    if ("465".equals(port)) p.put("mail.smtp.ssl.enable", "true");
    else p.put("mail.smtp.starttls.enable", "true");
    p.put("mail.smtp.connectiontimeout", "10000");
    p.put("mail.smtp.timeout", "10000");

    Session session = user == null ? Session.getInstance(p) : Session.getInstance(p, new Authenticator() {
      @Override
      protected PasswordAuthentication getPasswordAuthentication() {
        return new PasswordAuthentication(user, pass);
      }
    });

    try {
      MimeMessage msg = new MimeMessage(session);
      msg.setFrom(new InternetAddress(from, "Nexo", StandardCharsets.UTF_8.name()));
      msg.setRecipients(Message.RecipientType.TO, InternetAddress.parse(destino));
      msg.setSubject(asunto, StandardCharsets.UTF_8.name());

      MimeBodyPart plano = new MimeBodyPart();
      plano.setText(texto, StandardCharsets.UTF_8.name());
      MimeBodyPart rico = new MimeBodyPart();
      rico.setContent(html, "text/html; charset=utf-8");
      MimeMultipart cuerpo = new MimeMultipart("alternative", plano, rico);
      msg.setContent(cuerpo);

      Transport.send(msg);
    } catch (Exception e) {
      LOG.warning("[Mail] Error enviando a " + destino + ": " + e.getMessage());
      throw new ApiException(502, "No fue posible enviar el correo de verificación. Inténtalo de nuevo en unos minutos.");
    }
  }
}
