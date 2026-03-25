<div align="center">
  <img src="Logo SafeReturn.png" alt="SafeReturn Logo" width="200" />
  <h1>SafeReturn 🏥</h1>
  <p>
    <a href="https://github.com/JuanCamacho198/SafeReturn/releases/latest">
      <img src="https://img.shields.io/github/v/release/JuanCamacho198/SafeReturn?include_prereleases&style=flat" alt="GitHub Release" />
    </a>
    <a href="https://github.com/JuanCamacho198/SafeReturn/blob/main/LICENSE">
      <img src="https://img.shields.io/github/license/JuanCamacho198/SafeReturn?style=flat" alt="License" />
    </a>
  </p>
  
  <h3>📥 Descargar</h3>
  <p>
    <a href="https://github.com/JuanCamacho198/SafeReturn/releases/latest">
      <img src="https://img.shields.io/badge/Windows-.exe-blue?style=for-the-badge&logo=windows" alt="Download for Windows" />
    </a>
  </p>
</div>

---

SafeReturn es una aplicación de escritorio de salud **100% local** que utiliza una arquitectura de Generación Aumentada por Recuperación (RAG) para predecir la probabilidad de reingreso hospitalario a 30 días basándose en notas clínicas no estructuradas.

Construida para privacidad y cumplimiento, todos los datos y modelos se ejecutan **sin conexión** en la máquina local sin depender de APIs externas en la nube.

## Tabla de Contenidos

- [Características](#características)
- [Tech Stack](#tech-stack)
- [Instalación](#instalación)
- [Primeros Pasos](#primeros-pasos)
- [Configuración de API](#configuración-de-api)
- [Desarrollo](#desarrollo)
- [Arquitectura](#arquitectura)
- [Construcción para Producción](#construcción-para-producción)
- [Licencia](#licencia)

---

## Características

- 📊 **Dashboard de Riesgo**: Interfaz intuitiva para visualizar puntuaciones de riesgo de pacientes.
- 🧠 **RAG Local**: Procesa notas de pacientes, las vectoriza y recupera contexto para predicciones precisas del LLM.
- 🔍 **Explicabilidad**: Muestra los fragmentos exactos de las notas clínicas utilizados por el LLM para generar la predicción.
- 🔒 **Privacidad Primero**: Cero datos salen de la máquina host.
- 📈 **Predicción de Reingreso**: Modelo de IA que predice el riesgo de reingreso hospitalario a 30 días.
- 📤 **Exportación de Datos**: Exporta resultados y reportes a CSV o JSON.

## 📝 Changelog

### v0.9.1 (2026-03-25)
#### Nuevas Funciones
- 🌐 **Internacionalización (i18n)**: Español como idioma por defecto, Inglés como secundario. Selector de idioma en el navbar.
- 📊 **Dashboard Mejorado**: Panel de control con métricas, gráficos y datos de pacientes sintéticos.
- 🎨 **Tema Medical Light**: Interfaz limpia y profesional con colores hospitalarios.
- ⚙️ **Configuración de API Key**: Interfaz para configurar la API key de Groq desde la app.
- 🤖 **Predicción de Reingreso**: Análisis de riesgo de reingreso hospitalario a 30 días con evidencia clínica.
- 📋 **Datos de Pacientes**: 100 pacientes sintéticos incluidos para pruebas.

#### Mejoras Técnicas
- Actualizado a Vite 8
- Actualizado a Tailwind CSS 3
- Migración de svelte-chartjs a chart.js nativo
- Arreglos de compatibilidad con Svelte 5

### v0.9.0 (2026-03-24)
- Lanzamiento inicial
- Dashboard con tabla de pacientes
- Análisis de riesgo con RAG

## Tech Stack

| Capa | Tecnología |
|------|------------|
| Frontend | Tauri (Rust) + Svelte + Vite |
| Backend | Bun (TypeScript) |
| ML - Embeddings | sentence-transformers |
| ML - Vector Store | FAISS |
| LLM | Groq (API cloud) |
| Base de Datos | SQLite |

## Instalación

### Descargar la última versión

| Plataforma | Descarga |
|------------|----------|
| Windows (.exe) | [safeturn-0.9.1-setup.exe](https://github.com/JuanCamacho198/safereturn/releases/latest) |
| macOS (.dmg) | [safeturn-0.9.1.dmg](https://github.com/JuanCamacho198/safereturn/releases/latest) |
| Linux (.deb) | [safeturn-0.9.1.deb](https://github.com/JuanCamacho198/safereturn/releases/latest) |

### Requisitos Previos

- [Node.js](https://nodejs.org/) o [Bun](https://bun.sh/)
- [Rust](https://rustup.rs/) (para Tauri)
- Python 3.10+ (para scripts de ML/FAISS)

## 🛠️ Construir el .exe

Si deseas compilar el ejecutable tú mismo, usa estos comandos:

```bash
# 1. Build del Frontend (Svelte)
cd frontend
npm run build

# 2. Compilar el Backend (Bun sidecar)
cd ../backend
bun build ./index.ts --compile --outfile ../frontend/src-tauri/bin/backend-sidecar

# 3. Empaquetar con Tauri (genera el .exe)
cd ../frontend
npm run tauri build
```

El archivo `.exe` se generará en:
```
frontend/src-tauri/target/release/bundle/nsis/
```

> **Nota**: Necesitas tener Rust instalado (`rustup.rs`) y las dependencias de Tauri configuradas.

## Primeros Pasos

```bash
# 1. Clonar el repositorio
git clone https://github.com/JuanCamacho198/safereturn.git
cd safereturn

# 2. Instalar dependencias del frontend
cd frontend && npm install

# 3. Instalar dependencias del backend
cd ../backend && bun install

# 4. Configurar variables de entorno
cp .env.example .env
# Edita .env con tu API key de Groq

# 5. Ejecutar en modo desarrollo
npm run tauri dev
```

## Configuración de API

### Groq (Recomendado - Gratis y Rápido)

1. Obtén una API key gratuita en [console.groq.com/keys](https://console.groq.com/keys)
2. Crea un archivo `.env`:
   ```bash
   cp .env.example .env
   ```
3. Edita `.env` y añade tu key:
   ```
   GROQ_API_KEY=gsk_your_key_here
   ```

### Variables de Entorno

| Variable | Descripción | Valor por defecto |
|----------|-------------|-------------------|
| `GROQ_API_KEY` | Tu API key de Groq | Obligatorio |
| `GROQ_MODEL` | Modelo a usar | `llama-3.3-70b-versatile` |
| `EMBEDDING_MODEL` | Modelo de embeddings | `all-MiniLM-L6-v2` |

## Desarrollo

### Estructura del Proyecto

```
├── frontend/           # Aplicación Svelte + Tauri
│   ├── src/
│   │   ├── routes/    # Páginas de la app
│   │   └── lib/      # Componentes y utilidades
│   └── src-tauri/    # Configuración de Rust
├── backend/            # Servidor Bun (sidecar)
│   ├── services/      # Lógica de negocio
│   ├── ml/           # Modelos de ML
│   └── rag/          # Pipeline RAG
└── openspec/          # Documentación SDD
```

### Comandos Útiles

```bash
# Desarrollo
npm run tauri dev

# Verificar tipos
npm run check

# Build del frontend
cd frontend && npm run build

# Tests
cd backend && bun test
```

## Arquitectura

Consulta la documentación SDD en `openspec/` para propuestas completas, documentos de diseño y decisiones de arquitectura.

### Flujo de Predicción de Riesgo

1. **Ingesta de Datos**: Las notas clínicas se almacenan en SQLite.
2. **Vectorización**: Las notas se convierten en embeddings usando sentence-transformers.
3. **Recuperación**: FAISS recupera los casos más similares.
4. **Generación**: Groq LLM genera la predicción basada en el contexto recuperado.

## Construcción para Producción

Para empaquetar SafeReturn en un ejecutable de escritorio (.exe, .app, .deb):

1. **Build del Frontend**:
   ```bash
   cd frontend
   npm run build
   ```

2. **Empaquetar el Backend Sidecar (Bun)**:
   ```bash
   cd backend
   bun build ./index.ts --compile --outfile ../frontend/src-tauri/bin/backend-sidecar
   ```

3. **Empaquetar con Tauri**:
   ```bash
   cd frontend
   npm run tauri build
   ```

Esto generará el instalador final en `frontend/src-tauri/target/release/bundle/`.

## Licencia

MIT License - consulta el archivo [LICENSE](LICENSE) para más detalles.

---

<div align="center">
  <p>Construido con ❤️ para mejorar la atención médica</p>
</div>
