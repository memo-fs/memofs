---
title: "Visión General de @memofs/core"
description: "Arquitectura principal, exportaciones de subrutas, límites de tiempo de ejecución y primitivas de memoria del paquete @memofs/core."
---

# `@memofs/core`

`@memofs/core` es el entorno de memoria principal y el motor de contratos neutral respecto al proveedor para MemoFS. Proporciona los cimientos arquitectónicos para una memoria basada en archivos, versionada y semántica para agentes de IA.

## Exportaciones de Subrutas

Para garantizar la máxima portabilidad entre entornos de ejecución, `@memofs/core` se divide en tres puntos de entrada distintos:

| Subruta | Entorno de Destino | Descripción |
|---|---|---|
| **`@memofs/core`** | Node.js, Cloudflare Workers, Deno, Bun, Navegador | **Entrada raíz (compatible con Workers).** Expone el cliente unificado `MemoFS` (`new MemoFS({ ... })`), `RemoteBlobMemoryStore`, `InMemoryMemoryStore`, contratos de proveedores, algoritmos de grafos, recuperación híbrida, controles de seguridad y tipos. No importa módulos del sistema de archivos POSIX. |
| **`@memofs/core/node-fs`** | Node.js (>= 22) | **Entrada exclusiva para Node.** Proporciona `createNodeMemoFs` (la fábrica sin configuración que devuelve `new MemoFS`), `createNodeFsMemoryStore`, `NodeFsMemoryStore`, el lector de configuración sincrónico `readMemoFsConfigFileSync` y utilidades para directorios temporales de prueba. |
| **`@memofs/core/cloud-client`** | Cualquier entorno JavaScript | **Cliente de sincronización en la nube.** Expone `createMemoFsCloudClient`, `createMemoFsCloudClientFromEnv` y `createProjectScopedClient` para la replicación de archivos en dos fases contra MemoFS Cloud. |

## Instalación

Instala `@memofs/core` usando tu gestor de paquetes preferido:

::: code-group

```sh [pnpm]
pnpm add @memofs/core
```

```sh [npm]
npm install @memofs/core
```

```sh [yarn]
yarn add @memofs/core
```

```sh [bun]
bun add @memofs/core
```

```sh [deno]
deno add npm:@memofs/core
```
:::

> [!NOTE]
> Requiere **Node.js >= 22** cuando se ejecuta bajo el entorno de Node.js.

## Inicio Rápido

### 1. Aplicaciones en Node.js (Recomendado)

En aplicaciones Node.js, utiliza la fábrica `createNodeMemoFs` de `@memofs/core/node-fs`. Resuelve automáticamente `.memofs/config.json`, inicializa un `NodeFsMemoryStore` y devuelve un cliente `MemoFS` configurado:

```ts
import { createNodeMemoFs } from "@memofs/core/node-fs";

// Configura automáticamente NodeFsMemoryStore en rootDir
const memofs = createNodeMemoFs({
  rootDir: ".",
  mode: "local",
});

// Inicializa los archivos canónicos de .memofs/ si faltan
await memofs.bootstrap();

// Escribe una memoria duradera clasificada
const result = await memofs.writeMemory({
  title: "Selección de Base de Datos",
  content: "Usamos Cloudflare D1 para metadatos y R2 para almacenamiento de blobs.",
  kind: "decision",
  tags: ["architecture", "database"],
});
console.log(`Memoria guardada ${result.id} (nivel: ${result.tier})`);

// Recupera contexto de prompt con divulgación progresiva
const context = await memofs.context({
  query: "¿Qué base de datos usamos para metadatos?",
  taskType: "coding",
  detail: "compact",
});
console.log(context.text);
```

### 2. Edge y Cloudflare Workers

Para Cloudflare Workers o entornos serverless edge donde `node:fs` no está disponible, instancia `MemoFS` directamente con `new MemoFS({ ... })` y un adaptador de almacenamiento compatible con Workers como `RemoteBlobMemoryStore` (respaldado por `@memofs/adapter-r2` y `@memofs/adapter-turso`) o `InMemoryMemoryStore`:

```ts
import { MemoFS, RemoteBlobMemoryStore } from "@memofs/core";

// Inyecta adaptadores de almacenamiento de blobs y metadatos compatibles con Workers
const store = new RemoteBlobMemoryStore({
  blobClient: r2BlobClient,       // p. ej. de @memofs/adapter-r2
  metadata: tursoMetadataStore,   // p. ej. de @memofs/adapter-turso
  rootKey: "mi-raiz-de-proyecto",
});

const memofs = new MemoFS({
  store,
  projectId: "proyecto-123",
  mode: "local",
});

// Lee la memoria principal
const coreRules = await memofs.core.read();
console.log(coreRules);
```

## Capacidades Clave

- **Almacenamiento Canónico Basado en Archivos:** Toda la memoria se persiste bajo `.memofs/` en 11 archivos canónicos Markdown, JSON y JSONL.
- **Seguridad e Inteligencia de Escritura:** La lista de bloqueo de secretos integrada (`BLOCKLIST_RULES`) evita que claves API, JWTs y contraseñas lleguen a los archivos de memoria. La clasificación de durabilidad (`durable` frente a `transient`) mantiene las notas temporales en el registro de auditoría sin ensuciar los índices de búsqueda.
- **Entrega de Contexto Progresiva:** `memofs.context()` genera resúmenes con presupuesto de tokens controlado y cursores de sección (`expand`), evitando la saturación del prompt en el LLM.
- **Recuperación Híbrida y Decaimiento:** Combina búsqueda léxica BM25, coincidencia difusa e incrustaciones vectoriales con decaimiento temporal exponencial (vida media de 30 días).
- **Anclaje de Código y Detección de Desviación:** Vincula memorias a rutas de código y hashes SHA-256 mediante `AnchorRef`. Cuando el código cambia, los hechos pasan a estado `stale` con penalizaciones automáticas de relevancia.
- **Grafo de Conocimiento y Consolidación:** Extrae tripletas entidad-relación, realiza recorridos ponderados de camino más corto y fusiona entidades duplicadas.
- **Espacios de Trabajo de Agentes (AgentFS):** Proporciona entornos aislados de ejecución (`memofs.agentfs`) con extracción automática de memoria duradera al completar tareas.
- **Sincronización en la Nube en Dos Fases:** Replica archivos de memoria locales en MemoFS Cloud con verificación de hash criptográfico y cursores de sincronización monótonos.
