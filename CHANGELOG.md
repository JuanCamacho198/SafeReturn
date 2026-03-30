# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.2] - 2026-03-30

### Added
- Feature: Embeddings pipeline with sentence-transformers (all-MiniLM-L6-v2)
- Feature: FAISS index for similarity search
- Feature: Analysis history storage in database
- Feature: Diverse risk assessments (20%-80% range)
- Feature: Patient context (demographics, medications, labs) in risk analysis
- Feature: Change detection for suggesting re-analysis
- Feature: Centralized version management system

### Fixed
- Fix: Python script path resolution for Tauri
- Fix: AnalysisHistory table creation
- Fix: Event_type column in Encounters table

## [1.0.0] - 2026-03-25

### Added
- Feature: Timeline visual para historial de encuentros clínicos del paciente
- Feature: Nombres únicos mejorados para pacientes sintéticos
- Feature: Modal expandido para gráficos con navegación de teclado
- Feature: Mejoras en dashboard con gráficos de distribución y crecimiento
- Feature: Internacionalización extendida para medicamentos, resultados de laboratorio y outcomes
- Feature: Indicación de ruta de medicación y etiquetas de chequeo rutinario
- Feature: Mejoras de accesibilidad en componentes UI

### Fixed
- Bugfix: Manejo de errores para combinaciones de nombres vacías
- Bugfix: Validación de tipos de eventos en pacientes sintéticos

## [0.9.1] - 2026-03-25

### Added
- Patch: Small improvements and minor enhancements.

### Fixed
- Bugfix: Miscellaneous stability and formatting fixes.

## [0.9.0] - 2026-03-24

### Added
- Feature: Rename app to SafeReturn.
- Feature: Global version bump to 0.9.0.

### Fixed
- Bugfix: Fix Tauri build missing sidecar error.
