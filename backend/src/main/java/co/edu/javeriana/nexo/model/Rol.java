package co.edu.javeriana.nexo.model;

/** Roles del sistema Nexo (PUJ). */
public enum Rol {
  ESTUDIANTE("est"),
  DOCENTE("doc"),
  DIRECCION("dir"),
  ADMIN("adm");

  private final String codigo;

  Rol(String codigo) {
    this.codigo = codigo;
  }

  public String codigo() {
    return codigo;
  }

  public static Rol desdeCodigo(String c) {
    if (c == null) return ESTUDIANTE;
    for (Rol r : values()) {
      if (r.codigo.equalsIgnoreCase(c) || r.name().equalsIgnoreCase(c)) return r;
    }
    return ESTUDIANTE;
  }
}
