/**
 * Configuración de Firebase para Nexo (Pontificia Universidad Javeriana).
 * Conexión directa a Firebase Authentication y Cloud Firestore.
 * 
 * Si deseas cambiar de proyecto o usar tus propias credenciales:
 * Ve a Consola de Firebase > Configuración del proyecto > Tus apps > App web.
 */
export const FIREBASE_CONFIG = {
  apiKey: "AIzaSyD5ffDHG6dlyde-qVodmCDs1yGuY9IqZGs",
  authDomain: "nexo-7a24e.firebaseapp.com",
  projectId: "nexo-7a24e",
  storageBucket: "nexo-7a24e.firebasestorage.app",
  messagingSenderId: "935100505506",
  appId: "1:935100505506:web:03a22fb21e7dbbdff0e6fb",
  measurementId: "G-2874T2BZVR"
};

/**
 * URL base del backend en Java.
 * Cuando se ejecuta `mvn compile exec:java`, atiende en http://localhost:8080/api
 */
export const API_BASE = (typeof location !== 'undefined' && (location.hostname === 'localhost' || location.hostname === '127.0.0.1'))
  ? 'http://localhost:8080/api'
  : '/api';


/**
 * EmailJS: envía el correo con el código de verificación del registro.
 * Crea una cuenta gratis en https://www.emailjs.com, conecta un servicio de correo
 * y una plantilla, y pega aquí los tres valores. Mientras estén vacíos, el código
 * se muestra en pantalla (modo prueba).
 */
export const EMAILJS = {
  serviceId: '',   // Email Services → Service ID (p. ej. "service_abc123")
  templateId: '',  // Email Templates → Template ID (p. ej. "template_xyz789")
  publicKey: ''    // Account → General → Public Key
};

/**
 * Inicio de sesión con Microsoft (cuentas @javeriana.edu.co).
 * Requiere activar el proveedor "Microsoft" en Firebase Authentication con el
 * ID y el secreto de una app registrada en Microsoft Entra (Azure).
 * tenant: dominio o ID del directorio de la universidad; limita la ventana a sus cuentas.
 */
export const MICROSOFT = {
  enabled: true,
  tenant: 'javeriana.edu.co'
};
