# 🏥 Botica Salud & Vida — Sistema Web POS, Inventario FEFO y Machine Learning

[![Backend CI](https://github.com/Joseph-Pajuelo/botica-pos-ml/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/Joseph-Pajuelo/botica-pos-ml/actions/workflows/backend-ci.yml)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115+-009688?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-16-336791?logo=postgresql&logoColor=white)](https://www.postgresql.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Scikit--Learn](https://img.shields.io/badge/Scikit--Learn-1.6+-F7931E?logo=scikitlearn&logoColor=white)](https://scikit-learn.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://www.docker.com)
[![Tests](https://img.shields.io/badge/Tests-8%20passed-brightgreen?logo=pytest&logoColor=white)](https://pytest.org)

Sistema web integral de **Punto de Venta (POS)** y **Control de Inventario Farmacéutico** diseñado para boticas y farmacias independientes. Incorpora control estricto de caducidad bajo estándar **FEFO (First Expired, First Out)**, auditoría inmutable en **Kardex**, fraccionamiento de presentaciones, compatibilidad nativa con **lectores de código de barras USB (HID)** y un motor de **Machine Learning** para la proyección de demanda y generación de órdenes de compra sugeridas a droguerías.

---

## 📑 Tabla de Contenidos
1. [Problema y Solución](#-problema-y-solución)
2. [Reglas Críticas de Negocio Farmacéutico](#-reglas-críticas-de-negocio-farmacéutico)
3. [Arquitectura del Sistema](#-arquitectura-del-sistema)
4. [Stack Tecnológico](#-stack-tecnológico)
5. [Estructura del Proyecto](#-estructura-del-proyecto)
6. [Instalación y Puesta en Marcha](#-instalación-y-puesta-en-marcha)
7. [Usuarios y Cuentas de Acceso Demo](#-usuarios-y-cuentas-de-acceso-demo)
8. [Documentación de la API (Endpoints)](#-documentación-de-la-api-endpoints)
9. [Motor de Machine Learning (Cold Start & Predicción)](#-motor-de-machine-learning-cold-start--predicción)
10. [Flujo de Trabajo y Buenas Prácticas (Git Flow)](#-flujo-de-trabajo-y-buenas-prácticas-git-flow)

---

## 🎯 Problema y Solución

* **El Problema:** Las boticas independientes pierden entre un 8% y un 15% de su capital de trabajo debido a medicamentos vencidos en mostrador, sobrestock de productos de baja rotación y desabastecimiento de medicamentos de primera necesidad durante picos estacionales.
* **La Solución:** Una plataforma web contenerizada que automatiza la salida de medicamentos según su vencimiento (**FEFO**), bloquea ventas de lotes caducados, permite vender por pastilla suelta sin descuadrar el stock, y entrena modelos supervisados para sugerir exactamente cuántas cajas pedir al proveedor en un horizonte de 15 días.

---

## ⚖️ Reglas Críticas de Negocio Farmacéutico

1. **FEFO Estricto (*First Expired, First Out*):**  
   El stock no se descuenta de forma genérica. Al cobrar en el mostrador, el sistema toma automáticamente las unidades del lote vigente con fecha de vencimiento más próxima. Si el lote no alcanza, realiza **partición multi-lote automática** tomando el saldo del siguiente lote vigente.
2. **Bloqueo Sanitario en Mostrador:**  
   Si en la estantería existen unidades pero su fecha de caducidad expiró (`fecha_vencimiento < hoy`), la API bloquea la venta arrojando un error sanitario e indicando que el lote debe enviarse a merma.
3. **Fraccionamiento Preciso:**  
   Soporte para compra por caja y venta por **Caja**, **Blíster** o **Pastilla/Unidad**, recalculando internamente el consumo en la unidad mínima de control sin alterar el balance del inventario.
4. **Kardex Inmutable:**  
   Prohibición de sentencias `DELETE` o `UPDATE` manuales en el stock. Cada movimiento (`VENTA`, `COMPRA`, `MERMA_VENCIMIENTO`, `AJUSTE_INVENTARIO`) genera un asiento inalterable con fecha, lote, cantidad y saldo resultante.
5. **Agilidad en Mostrador (Lector USB HID):**  
   Captura de ráfagas de teclado del lector de código de barras en menos de **60 ms** y emisión de **Boleta/Ticket térmico de 80mm y 58mm** con desglose de lotes despachados.
6. **Sugerencia de Sustitutos Bioequivalentes:**  
   Cuando un medicamento de marca se agota, el sistema busca alternativas activas que compartan el mismo `principio_activo` con stock disponible, ordenadas por precio.

---

## 🏗️ Arquitectura del Sistema

```text
[ Lector USB (HID) / Ticketera Térmica ]
             │ (Eventos rápidos < 60ms / @media print)
             ▼
[ Frontend Web: React 19 + Vite + Tailwind CSS v4 ]
  (Diseño cálido y editorial para farmacia - Botica Salud&Vida)
             │ (REST API / JWT Bearer / JSON)
             ▼
[ Backend: FastAPI (Python 3.11+) ]
     ├── Seguridad: Autenticación JWT + Roles (ADMIN, FARMACEUTICO, CAJERO)
     ├── Servicios: Lógica FEFO, Fraccionamiento, Kardex, Sustitutos
     ├── Machine Learning: Scikit-learn / LightGBM (Lags t-7, t-14, t-30)
     └── Reportes: Exportación CSV/Excel y Resumen Ejecutivo
             │
             ▼
[ Base de Datos: PostgreSQL 16 (o SQLite para entorno local ligero) ]
     └── Tablas: usuarios, productos, lotes, ventas, detalle_ventas, kardex
```

---

## 💻 Stack Tecnológico

| Capa | Tecnologías |
| :--- | :--- |
| **Backend** | Python 3.11+, FastAPI, SQLAlchemy 2.0 ORM, Pydantic v2, Pydantic-Settings |
| **Machine Learning** | Scikit-learn (`HistGradientBoostingRegressor`), LightGBM, NumPy, Pandas |
| **Base de Datos** | PostgreSQL 16 (Producción / Docker) y SQLite (Pruebas unitarias) |
| **Frontend** | React 19, Vite 6, Tailwind CSS v4, Lucide React, Axios, React Router 7 |
| **DevOps & QA** | Docker & Docker Compose, GitHub Actions CI, Pytest (8/8 tests pasando) |

---

## 📁 Estructura del Proyecto

```text
botica-pos-ml/
├── docker-compose.yml              # Orquestación de Contenedores (db, backend, frontend)
├── .env.example                    # Plantilla de variables de entorno
├── .gitignore                      # Exclusiones de Git (node_modules, .venv, claves)
├── README.md                       # Documentación principal del sistema
├── PROJECT_CONTEXT.md              # Contexto de negocio y requerimientos iniciales
├── DesingBotica.md                 # Sistema de diseño de interfaz (Estilo Dub)
├── QA_SEGURIDAD_ESCALADO.md        # Reporte de calidad, seguridad y guía de despliegue
├── .github/
│   ├── pull_request_template.md    # Formulario estandarizado para Pull Requests
│   └── workflows/
│       └── backend-ci.yml          # Flujo de CI que corre pytest automáticamente
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt            # Dependencias de Python
│   ├── app/
│   │   ├── main.py                 # Aplicación FastAPI, CORS y middleware
│   │   ├── core/                   # Configuración, sesión de base de datos y seguridad JWT
│   │   ├── models/                 # Modelos SQLAlchemy 2.0 (Usuario, Producto, Lote, Venta, Kardex)
│   │   ├── schemas/                # Esquemas Pydantic v2 de validación de datos
│   │   ├── api/v1/                 # Endpoints REST (auth, productos, inventario, pos, ml, reportes)
│   │   ├── services/               # Lógica de negocio (FEFO, fraccionamiento, ventas, reportes)
│   │   └── ml/                     # Motor predictivo, feature builder y seeder de datos
│   └── tests/                      # Suite de pruebas automatizadas con Pytest
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── components/             # UI reutilizable (Navbar, BoticaLogo, ThermalTicket, Modal)
│       ├── pages/                  # Vistas (POS Venta, Ventas/Caja, Catálogo, Lotes/Kardex, ML)
│       ├── hooks/                  # useBarcodeScanner (HID), useKeyboardShortcuts
│       └── services/               # Cliente HTTP Axios y fallback offline local
└── scripts/
    ├── init_db.sql                 # Script DDL puro para inicializar PostgreSQL
    ├── generate_fake_data.py       # Generador CLI de 12 meses de datos sintéticos (Cold Start)
    └── windows_backup.bat          # Script de respaldo de base de datos
```

---

## 🚀 Instalación y Puesta en Marcha

### Opción 1: Ejecución Rápida con Docker Compose (Recomendada)

1. Clonar el repositorio:
   ```bash
   git clone https://github.com/Joseph-Pajuelo/botica-pos-ml.git
   cd botica-pos-ml
   ```
2. Crear el archivo de variables de entorno:
   ```bash
   cp .env.example .env
   ```
3. Levantar los contenedores:
   ```bash
   docker compose up --build
   ```
4. Abrir en el navegador:
   * **Frontend Web (POS & Inventario):** [http://localhost:5173](http://localhost:5173)
   * **Backend API & Swagger:** [http://localhost:8000/docs](http://localhost:8000/docs)

---

### Opción 2: Ejecución Local en Desarrollo (Sin Docker)

#### 1. Backend (FastAPI):
```bash
# Crear y activar entorno virtual
python -m venv .venv
# En Windows:
.\.venv\Scripts\activate
# En Linux/macOS:
source .venv/bin/activate

# Instalar dependencias
pip install -r backend/requirements.txt pytest

# Iniciar la API con base de datos local SQLite o PostgreSQL
uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port 8000 --reload
```

#### 2. Frontend (React + Vite):
```bash
cd frontend
npm install
npm run dev
```

---

## 🔑 Usuarios y Cuentas de Acceso Demo

El sistema crea automáticamente las cuentas semilla al iniciar el backend:

| Usuario | Contraseña | Rol | Alcance |
| :--- | :--- | :--- | :--- |
| **`admin`** | `admin123` | `ADMIN` | Acceso completo (Configuración, usuarios, reportes gerenciales) |
| **`farmaceutico`** | `farma123` | `FARMACEUTICO` | Gestión de lotes, ajustes de inventario, mermas y catálogo |
| **`cajero`** | `caja123` | `CAJERO` | Mostrador de ventas POS, cobro y emisión de tickets |

---

## 📡 Documentación de la API (Endpoints Principales)

La documentación interactiva OpenAPI/Swagger se encuentra en `http://localhost:8000/docs`.

### 🔐 Seguridad y Autenticación
* `POST /api/v1/auth/login`: Autentica con usuario y contraseña; devuelve token JWT Bearer.
* `GET /api/v1/auth/me`: Retorna los datos del usuario autenticado a partir del token.
* `GET /api/v1/auth/usuarios`: Listado de trabajadores registrados.

### 💊 Catálogo y Lector de Código de Barras
* `GET /api/v1/productos/barcode/{codigo_barras}`: Endpoint ultra-rápido (< 60 ms) para el lector USB que retorna producto, stock FEFO vigente y próximo vencimiento.
* `GET /api/v1/productos`: Búsqueda de medicamentos por nombre o principio activo.
* `GET /api/v1/productos/{producto_id}/sustitutos`: Lista alternativas con el mismo principio activo y stock vigente ordenadas por menor precio.
* `POST /api/v1/productos`: Registro de nuevos productos y factores de conversión.

### 🛒 Punto de Venta (POS)
* `POST /api/v1/pos/ventas`: Procesa una venta aplicando fraccionamiento, partición multi-lote FEFO y registro en Kardex.
* `GET /api/v1/pos/ventas`: Listado de ventas recientes y arqueo de caja.
* `POST /api/v1/pos/ventas/{venta_id}/anular`: Anula una venta restaurando el stock al lote original y asentando el movimiento compensatorio en Kardex.

### 📦 Inventario, Lotes y Kardex
* `POST /api/v1/inventario/lotes`: Registro de ingreso de compra de nuevo lote con vencimiento.
* `GET /api/v1/inventario/alertas-vencimiento`: Filtra lotes próximos a caducar (en 30, 60 o 90 días).
* `POST /api/v1/inventario/ajustes`: Registro de mermas por vencimiento o mermas físicas.
* `GET /api/v1/inventario/kardex/lote/{lote_id}`: Historial inmutable de movimientos del lote.

### 📊 Machine Learning y Reportes
* `GET /api/v1/ml/reorder-suggestions`: Sugerencias de compra proyectadas a 15 días con clasificación de urgencia (`CRITICO`, `ALERTA_REORDEN`, `RIESGO_VENCIMIENTO`, `OPTIMO`).
* `POST /api/v1/ml/seed-cold-start`: Inyección de 12 meses de datos simulados para calibrar el modelo.
* `GET /api/v1/reportes/resumen-ejecutivo`: Indicadores financieros, ticket promedio y valorización del inventario.
* `GET /api/v1/reportes/exportar/orden-compra-ml.csv`: Descarga en Excel/CSV de la orden de compra sugerida.
* `GET /api/v1/reportes/exportar/kardex.csv`: Descarga del libro de Kardex para auditoría contable.

---

## 🧠 Motor de Machine Learning (Cold Start & Predicción)

* **Problema de Arranque en Frío (*Cold Start*):** Al inaugurar una botica digitalizada no existe historial. Se provee `scripts/generate_fake_data.py` (o `POST /api/v1/ml/seed-cold-start`) que genera 12 meses de demanda estacional realista.
* **Variables Predictivas (Features):** Lags de ventas a $t-7$, $t-14$, $t-30$, tendencia semanal, día de la semana y días restantes para el vencimiento del lote activo.
* **Algoritmo:** Regresión por Gradient Boosting (`HistGradientBoostingRegressor` / `LGBMRegressor`) para pronosticar las unidades que se venderán en los siguientes 15 días.
* **Cálculo de Reorden:** Convierte el déficit de unidades a **cajas cerradas** a pedir a la droguería con base en el factor `unidades_por_caja`.

---

## 🧪 Pruebas Automatizadas

El proyecto cuenta con cobertura de pruebas unitarias y de integración que se ejecutan automáticamente en cada PR mediante GitHub Actions:

```bash
# Ejecutar todas las pruebas con Pytest
pytest -p no:cacheprovider backend/tests/ -v
```

Casos probados:
* Autenticación JWT y validación de tokens.
* Búsqueda de sustitutos bioequivalentes y anulación de venta con reversión en Kardex.
* Generador Cold-Start y predicción supervisada de Machine Learning.
* Descuento multi-lote FEFO y balance del Kardex.
* Bloqueo de fraccionamiento en productos no fraccionables.
* Rechazo por stock insuficiente.
* Bloqueo sanitario en mostrador para medicamentos vencidos.

---

## 👥 Flujo de Trabajo y Buenas Prácticas (Git Flow)

* **`main`:** Rama de producción protegida. Requiere aprobación y PR desde `develop`.
* **`develop`:** Rama de integración continua predeterminada.
* **`feature/<modulo>-<descripcion>`:** Ramas de trabajo diario (eliminación automática al fusionarse).
* **Conventional Commits:** `feat:`, `fix:`, `docs:`, `chore:`.

---

## 📄 Licencia

Proyecto desarrollado bajo fines académicos y comerciales para gestión farmacéutica eficiente.
