package co.edu.javeriana.nexo.model;

/** Roles del sistema. El código corto coincide con el que usa el frontend (est, doc, dir). */
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
}
