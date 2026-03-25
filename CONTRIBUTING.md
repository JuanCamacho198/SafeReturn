# Contributing to SafeReturn

¡Gracias por tu interés en contribuir a SafeReturn!

## Código de Conducta

Este proyecto se adhiere al código de conducta de Contributor Covenant. Al participar, se espera que mantengas este código.

## ¿Cómo contribuir?

### Reportar Bugs

Si encontraste un bug, por favor crea un issue en GitHub con:
- Título claro describiendo el problema
- Pasos detallados para reproducir el bug
- Tu entorno (SO, versión de Node/Bun/Rust)
- Capturas de pantalla si aplica

### Sugerir Features

Para sugerir nuevas funcionalidades:
- Busca primero si ya existe una propuesta similar
- Crea un issue con la etiqueta "enhancement"
- Explica el caso de uso y por qué sería útil
- Incluye mockups si es posible

### Pull Requests

1. Haz fork del repositorio
2. Crea una rama para tu feature (`git checkout -b feature/nueva-funcionalidad`)
3. Haz tus cambios siguiendo las convenciones del proyecto
4. Asegúrate de que los tests pasen (`npm run check` o `bun run check` y `bun test`)
5. Commitea tus cambios con mensajes claros
6. Push a tu rama y crea un Pull Request

## Entorno de Desarrollo

```bash
# Clonar y setup
git clone https://github.com/JuanCamacho198/SafeReturn.git
cd SafeReturn

# Instalar dependencias
cd frontend && npm install
cd ../backend && bun install

# Configurar variables de entorno
cp .env.example .env
# Edita .env con tu API key de Groq

# Ejecutar en desarrollo con NPM o Bun
npm run tauri dev
bun run tauri dev

```

## Estándares de Código

- **Frontend**: Svelte + TypeScript (usa `npm run check` para verificar)
- **Backend**: Bun + TypeScript (usa `bun test` para tests)
- **Commits**: Conventional Commits (ej: `feat: add new risk calculation`)

## Recursos

- [Documentación](https://github.com/JuanCamacho198/SafeReturn#readme)
- [Issues](https://github.com/JuanCamacho198/SafeReturn/issues)
- [Discusiones](https://github.com/JuanCamacho198/SafeReturn/discussions)
