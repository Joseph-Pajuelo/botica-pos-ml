"""
Script CLI para inyectar 12 meses de datos sintéticos en PostgreSQL (Cold Start ML).
Uso:
    python scripts/generate_fake_data.py
"""
import os
import sys

# Permitir importar el paquete `app` desde `backend/`
ROOT_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACKEND_DIR = os.path.join(ROOT_DIR, "backend")
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

from app.core.database import SessionLocal, init_db  # noqa: E402
from app.ml.seeder import ColdStartSeeder  # noqa: E402


def main() -> None:
    print("Inicializando tablas de base de datos...")
    init_db()
    with SessionLocal() as db:
        seeder = ColdStartSeeder(db)
        resultado = seeder.ejecutar_seed(meses_historia=12)
        print(f"[OK] {resultado.mensaje}")
        print(f" - Productos creados : {resultado.productos_creados}")
        print(f" - Lotes FEFO creados: {resultado.lotes_creados}")
        print(f" - Ventas simuladas  : {resultado.ventas_simuladas}")


if __name__ == "__main__":
    main()
