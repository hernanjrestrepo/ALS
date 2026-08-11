# 🚀 Quick Start Guide - ALS V2

Esta es una guía rápida para comenzar con el proyecto localmente y prepararlo para deployment.

---

## ⚡ Inicio Rápido Local

### 1. Clonar el Repositorio (cuando esté en Git)

```bash
git clone <repository-url>
cd als-v2
```

### 2. Backend Setup

```bash
cd server

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Editar .env con tus configuraciones
# (Asegúrate de tener JWT_SECRET único)

# Generar Prisma Client
npx prisma generate

# Ejecutar migraciones
npx prisma migrate dev

# Iniciar servidor de desarrollo
npm run dev
```

El backend estará corriendo en `http://localhost:3000`

### 3. Frontend Setup

```bash
# En otra terminal
cd client

# Instalar dependencias
npm install

# Copiar variables de entorno
cp .env.example .env

# Iniciar aplicación
npm run dev
```

El frontend estará corriendo en `http://localhost:5173`

### 4. Iniciar Ollama

```bash
# Asegúrate de tener Ollama instalado
ollama serve

# En otra terminal, descargar el modelo
ollama pull llama3.2:3b
```

---

## 📝 Comandos Git para Subir el Proyecto

### Primera vez (Inicializar repo)

```bash
# Desde la raíz del proyecto (als-v2/)
git init
git add .
git commit -F COMMIT_MESSAGE.md

# Agregar remote (reemplaza con tu URL)
git remote add origin https://github.com/tu-usuario/als-v2.git

# Subir a GitHub/GitLab
git push -u origin main
```

### Commits subsecuentes

```bash
git add .
git commit -m "descripción del cambio"
git push
```

---

## 🧪 Templates Docxtemplater

El sistema usa 13 plantillas Word normalizadas para docxtemplater en `server/templates/docxtemplater/`.

Para probar renderizados localmente:

```bash
cd server
node scripts/templates/render_all_matrices.js
```

Los resultados se guardan en `server/uploads/reports/`.

---

## ✅ Checklist Pre-Commit

Antes de hacer commit, verifica:

- [ ] ✅ `.env` NO está incluido (debe estar en .gitignore)
- [ ] ✅ `node_modules/` NO está incluido
- [ ] ✅ Base de datos de desarrollo (`.db`) NO está incluida
- [ ] ✅ Archivos en `uploads/` NO están incluidos (excepto `.gitkeep`)
- [ ] ✅ `.env.example` SÍ está incluido con valores de ejemplo
- [ ] ✅ README.md está actualizado
- [ ] ✅ Código compila sin errores (`npm run build` en ambos folders)
- [ ] ✅ Templates docxtemplater funcionan (`node scripts/templates/render_all_matrices.js`)

---

## 🔐 Variables de Entorno Importantes

### Backend (.env)

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="tu-secret-unico-aqui"
PORT=3000
CORS_ORIGIN="http://localhost:5173"
OLLAMA_BASE_URL="http://localhost:11434"
OLLAMA_MODEL="llama3.2:3b"
NODE_ENV="development"
```

### Frontend (.env)

```env
VITE_API_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:** 
- Nunca subas archivos `.env` a Git
- Genera un JWT_SECRET único para producción: `openssl rand -base64 32`
- Cambia CORS_ORIGIN y VITE_API_URL para producción

---

## 🌐 Preparar para Producción

1. **Actualiza** variables de entorno para producción
2. **Genera** JWT_SECRET seguro
3. **Verifica** que Ollama esté instalado en el servidor (si usas IA local)
4. **Revisa** que los templates docxtemplater estén en `server/templates/docxtemplater/`

---

## 🐛 Troubleshooting Común

### Backend no inicia

```bash
# Verificar Prisma
cd server
npx prisma generate
npx prisma migrate dev

# Ver logs
npm run dev
```

### Frontend no conecta al backend

```bash
# Verificar VITE_API_URL en client/.env
# Debe ser http://localhost:3000 para desarrollo
```

### Ollama no responde

```bash
# Verificar que esté corriendo
curl http://localhost:11434/api/tags

# Reiniciar Ollama
ollama serve
```

### Error de CORS

```bash
# Verificar CORS_ORIGIN en server/.env
# Debe coincidir con el puerto del frontend
```

### Templates docxtemplater no renderizan

```bash
# Verificar que las plantillas existen
ls server/templates/docxtemplater/

# Verificar que no hay errores de sintaxis en placeholders
node scripts/templates/render_all_matrices.js
```

---

## 📚 Documentación Adicional

- **README.md** - Arquitectura completa y guía técnica
- **server/docs/templates/README.md** - Documentación de templates docxtemplater
- **server/docs/templates/RESUMEN_EJECUTIVO.md** - Resumen de normalización

---

## 🎯 Siguiente Paso

Una vez que todo funcione localmente:

1. Revisa que todo esté ✅
2. Haz commit con `git commit -m "descripción del cambio"`
3. Push a tu repositorio

---

## 👥 Contacto

Para soporte del proyecto, contactar al equipo de Paradixe.

---

**¡Listo para desarrollar!** 💻
