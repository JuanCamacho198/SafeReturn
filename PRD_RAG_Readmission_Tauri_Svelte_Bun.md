# PRD: Sector Salud - Analisis Predictivo de Reingresos con LLMs y RAG

Version: 0.1.0
Fecha: 2026-03-18
Autor: Equipo Universidad / Juan Camacho

## 1. Objetivo
- Desarrollar una aplicacion de escritorio local (sin datos externos) que use una arquitectura RAG para predecir la probabilidad de reingreso en 30 dias a partir de notas clinicas no estructuradas.
- La UI debe ser intuitiva para medicos, con explicaciones basadas en fragmentos de notas recuperadas y visualizacion de riesgos.
- Emplear Tauri + Svelte para el front-end, y Bun como runtime de la capa de negocio cuando sea posible. Mantener operacion completamente local (offline) durante el MVP.

## 2. Alcance (Scope)
- MVP (0-12 semanas):
  - Lectura de notas sinteticas/desidentificadas; pipeline de procesamiento local.
  - Indexado de notas usando embeddings, vector store local (FAISS) y busqueda reticulada.
  - Generacion de prediccion de riesgo con LLM local (llama.cpp u equivalente) y prompts estructurados; explicaciones basadas en fragmentos recuperados.
  - UI desktop con dashboard de riesgos, drill-down de notas y exportacion de resultados.
  - Seguridad basica: login local, registro de accesos, proteccion de archivos sensibles; datos de prueba sinteticos.
- Subsecuentes (opcional): multi-hospital, analisis de sesgos, mejoras de explicabilidad, empaquetado // distribución via instalador.

## 3. Supuestos y dependencias
- Todo el data set de pruebas sera sintetico o desidentificado; no se trabajara con datos reales de pacientes.
- El sistema funciona en un entorno local (PC con Windows) con capacidad moderada de CPU/GPU para inference local.
- Se puede usar Bun para orquestacion/servicios web locales; tambien se puede targuetar una comunicacion IPC entre frontend Svelte/Tauri y backend Bun.
- No se requieren acuerdos HIPAA para la version educativa; se documentaran buenas practicas para adaptarlo a entornos reales.

## 4. Stakeholders y roles
- Profesor responsable: supervision academica.
- Equipo de desarrollo (Universidad): diseno tecnico, implementacion, pruebas.
- Usuarios finales (estudiantes/medicos simulados): uso del producto para cumplir objetivos de evaluacion.
- Equipo de seguridad/etica: revisiones de riesgos, sesgos y manejo de datos sinteticos.

## 5. Personas (User Personas)
- Medico, 35-60 años: quiere ver rapidamente el nivel de riesgo y notas basadas en fragmentos, con explicacion breve.
- Data Scientist estudiante: quiere entender la pipeline, possible calibracion y evaluacion de rendimiento.
- Administrador de sistema: quiere desplegar y mantener la app localmente, con registro de accesos y backup.

## 6. Requisitos del producto

### 6.1 Requisitos funcionales (FR)
- FR1: Ingesta de notas desidentificadas (desidentificacion basica) y metadatos de pacientes en una base local.
- FR2: Generacion de embeddings clinicos y almacenamiento en vector store local (FAISS).
- FR3: Pipeline RAG: recuperacion de 5-10 fragmentos por paciente al generar la prediccion.
- FR4: LM local para generar prediccion de riesgo (0-1) y explicacion basada en documentos recuperados; salida con sources.
- FR5: UI desktop en Tauri con frontend Svelte que muestre lista de pacientes, puntaje y drill-down de notas recuperadas.
- FR6: Exportacion de resultados a CSV/JSON para analisis posterior.
- FR7: Seguridad basica: login local, registro de accesos, cifrado basico de datos sensibles.
- FR8: Reset de datos y pruebas con datos sinteticos.

### 6.2 Requisitos no funcionales (NFR)
- NFR1: Rendimiento: inferencia de puntaje en tiempo razonable (segundos por consulta) en hardware de laboratorio.
- NFR2: Disponibilidad: operacion local, sin dependencias de red para MVP.
- NFR3: Seguridad y privacidad: minimizacion de datos PHI, desidentificacion, control de acceso, logs sin informacion sensible.
- NFR4: Mantenibilidad: codigo modular, tests basicos, docs de uso y deployment.
- NFR5: Usabilidad: UI clara, explicaciones visibles, y navegacion intuitiva.
- NFR6: Portabilidad: puede empaquetarse con Tauri en Windows; plan de portabilidad a macOS/Linux.
- NFR7: Compatibilidad de hardware: soporte para CPU con GPU opcional; memoria suficiente para FAISS y embeddings.

### 6.3 Requisitos de interfaz de usuario (UI/UX)
- Dashboard con tarjetas de riesgo, filtros de rango de fechas, y grafico de distribucion de riesgos.
- Seccion de fragments citados con opciones de copiar/exportar.
- Modo oscuro opcional; diseño responsive para uso en monitor y laptop.

## 7. Arquitectura de alto nivel
- Frontend: Svelte + Vite dentro de un contenedor Tauri para escritorio. Bun como runtime de la capa de negocio o como servidor local de endpoints.
- Backend/Logica: microservicio local implementado en Bun (JS/TS) que expone endpoints para ingestion, entrenamiento/embedding, y prediccion; utliza FAISS para embbedings y una libreria local para LLM (llama.cpp o equivalente) para inferencia.
- Almacenamiento: SQLite para metadatos; FAISS en disco para embeddings; archivos de notas desidentificadas en carpeta segura.
- Flujo de datos:
  1) Ingesta de notas (desidentificadas) -> 2) Preprocesado y creacion de embeddings -> 3) Indexacion en FAISS -> 4) Solicitud de prediccion desde UI -> 5) Generacion de explicacion con LM local -> 6) Presentacion en UI.

## 8. Tecnología propuesta (Stack)
- Frontend: Svelte (con SvelteKit opcional) + Vite.
- Desktop container: Tauri (Rust) que aloja la app Svelte.
- Runtime/Backend: Bun (Node.js/JS) para endpoints y orquestacion local.
- ML/IR local: embeddings SBERT (sentence-transformers), FAISS para el vector store; LM local con llama.cpp o GGML (LLaMA 2/3 u otros).
- Despliegue y empaquetado: pruebas con Docker-Compose para desarrollo; Tauri para empaquetado en un instalador de Windows; posibilidad de empaquetar en un ejecutable webNPM/Bun.
- Almacenamiento: SQLite; archivos de datos desidentificados en disco.
- Seguridad/Logs: cifrado basico de archivos sensibles, logs sin datos privados, autenticacion local simple.

## 9. MVP y plan de entregas
- MVP A (semana 1-4): estructura del repositorio; proyecto Tauri + Svelte; endpoints Bun; pipeline de ingestion con datos sintéticos; UI basica con lista de pacientes y puntaje.
- MVP B (semana 5-8): embeddings, FAISS, explicaciones basadas en fragmentos, exportacion CSV, tests basicos.
- MVP C (semana 9-12): empaquetado Tauri, docs de instalacion, guia de usuario, plan de evaluacion con escenarios de pruebas.

## 10. Entregables
- Estructura de proyecto con folders: frontend/, backend/, data/, models/, vector_store/, tauri/, docs/.
- Codigo fuente base de Svelte + Bun + Tauri; script de inicializacion; pipeline MVP.
- Archivos de diseño: diagrama de flujo de datos, diagrama de arquitectura.
- Documentacion de uso, guia de instalacion, y guia de evaluacion.
- Datos sinteticos de prueba (no datos reales).  

## 11. Plan de evaluacion y criterios de aceptacion
- Criterios de exito (aceptacion):
  - FUNC: la app carga notas sinteticas, genera embeddings, y devuelve puntaje de riesgo 0-1 junto con al menos 1 fragmento de la nota como soporte.
  - UI: muestra tablero de control, detalle por paciente, y exporta resultados.
  - TECH: pipeline funciona en local con Bun + Svelte + Tauri; empaquetado de instalador sencillo.
- Medidas: AUC/PR con dataset sintetico; analisis de explicabilidad; rendimiento de inferencia < N segundos.
- Seguridad: se documenta minimizacion de datos, logs sin PHI, y control de acceso local.

## 12. Plan de riesgos y mitigaciones
- Riesgo: datos reales o PHI expuestos; Mitigacion: usar datos sintetic; desidentificacion; logs sin PHI.
- Riesgo: rendimiento insuficiente en hardware modesto; Mitigacion: usa modelos quantizados; optimizar con 4-bit; fallback a CPU.
- Riesgo: complejidad de packaging; Mitigacion: MVP con stack simple; plan de empaquetado en fases.

## 13. Anexos
- Glosario: RAG, Embeddings, FAISS, LLM local, Tauri, Bun, Svelte.
- Referencias de tecnologias y guias de integracion general (sin codificar).

### Aprobaciones
- Profesor responsable: ______________________
- Supervisor del equipo: _____________________
- Fecha: _____________________
