---
title: "Conceptos Fundamentales de Memoria"
description: "Estructura de los 11 archivos canónicos, niveles de durabilidad, seguridad de secretos, anclaje de código, decaimiento de memoria y grafos de conocimiento en MemoFS."
---

# Conceptos Fundamentales

MemoFS organiza la memoria de los agentes en capas estructuradas y con ámbito a nivel de proyecto. Al separar la memoria según su frecuencia de recuperación y propósito, el sistema evita la saturación del contexto preservando el conocimiento a largo plazo.

## Estructura de los 11 Archivos Canónicos

En la raíz de tu espacio de trabajo, MemoFS gestiona todo el estado de la memoria dentro del directorio `.memofs/` a través de 11 archivos canónicos:

```
.memofs/
├── manifest.json              # [1]  Activos de memoria rastreados y caché de hashes de anclaje
├── memory/
│   ├── core.md                # [2]  Reglas canónicas y hechos base del proyecto
│   └── notes.md               # [3]  Notas de memoria archivadas con marca de tiempo
├── events/
│   ├── memory-events.jsonl    # [4]  Registro de auditoría de escritura y eventos (solo adición)
│   └── conversations.jsonl    # [5]  Historial cronológico de interacciones y turnos de conversación
├── indexes/
│   ├── chunks.jsonl           # [6]  Fragmentos de texto para recuperación léxica
│   └── embeddings.jsonl       # [7]  Incrustaciones vectoriales persistidas
├── graph/
│   ├── nodes.jsonl            # [8]  Nodos de entidades (conceptos, herramientas, decisiones)
│   └── edges.jsonl            # [9]  Tripletas de relaciones y dependencias
├── snapshots/
│   ├── snapshots.jsonl        # [10] Índice de puntos de control e instantáneas
│   └── <snapshot-id>.json     # Puntos de control dinámicos de instantáneas
├── connectors.json            # [11] Conectores de fuentes externas (sin secretos)
├── archive/
│   └── <memory-id>.json       # Registros de memoria archivados en frío con fidelidad completa
└── tmp/                       # Directorio de trabajo temporal del espacio de trabajo
```

### Referencia de Archivos Canónicos

| Archivo | Constante de Protocolo | Formato | Patrón de Acceso | Propósito |
|---|---|---|---|---|
| `.memofs/manifest.json` | `MANIFEST_PATH` | JSON | Lectura al inicio | Manifiesto de todas las rutas canónicas, metadatos y caché de hashes. |
| `.memofs/memory/core.md` | `CORE_MEMORY_PATH` | Markdown | Cargado en contexto | Identidad resumida de alto valor, reglas de base y restricciones. |
| `.memofs/memory/notes.md` | `NOTES_MEMORY_PATH` | Markdown | Añadido bajo demanda | Notas extensas con marca de tiempo, decisiones y referencias de arquitectura. |
| `.memofs/events/memory-events.jsonl` | `MEMORY_EVENTS_PATH` | JSONL | Solo adición | Registro de auditoría de operaciones (`memory.created`, `memory.archived`, etc.). |
| `.memofs/events/conversations.jsonl` | `CONVERSATIONS_MEMORY_PATH` | JSONL | Solo adición | Turnos cronológicos de conversación para reconstrucción histórica. |
| `.memofs/indexes/chunks.jsonl` | `CHUNKS_INDEX_PATH` | JSONL | Consulta en recall | Fragmentos de texto y metadatos léxicos para BM25 y búsqueda difusa. |
| `.memofs/indexes/embeddings.jsonl` | `EMBEDDINGS_INDEX_PATH` | JSONL | Consulta en recall | Incrustaciones vectoriales para puntuación de similitud semántica. |
| `.memofs/graph/nodes.jsonl` | `GRAPH_NODES_PATH` | JSONL | Consultas de grafo | Vértices de entidades (características, símbolos, conceptos, decisiones). |
| `.memofs/graph/edges.jsonl` | `GRAPH_EDGES_PATH` | JSONL | Consultas de grafo | Aristas de relaciones (`depends_on`, `supersedes`, `uses`, `mentions`). |
| `.memofs/snapshots/snapshots.jsonl` | `SNAPSHOTS_INDEX_PATH` | JSONL | Bajo demanda | Índice de metadatos de instantáneas y puntos de control disponibles. |
| `.memofs/connectors.json` | `CONNECTORS_PATH` | JSON | Unidad de sincronización | Declaraciones de fuentes externas (GitHub, Notion). Solo usa `secretRef`. |

## Niveles de Durabilidad (`durable` frente a `transient`)

Cuando se escribe una memoria a través de `memofs.writeMemory()`, MemoFS clasifica su nivel de durabilidad:

- **`durable` (duradera)**: Hechos, decisiones y restricciones de alto valor. Se escriben en `notes.md`, se registran en `memory-events.jsonl` y **se indexan en el índice de recuperación y el grafo de conocimiento** para guiar futuras sesiones.
- **`transient` (transitoria)**: Observaciones de borrador, estado de trabajo temporal o conjeturas de baja confianza. Se escriben en `notes.md` y `memory-events.jsonl` como pista de auditoría, pero **nunca se indexan en la recuperación ni en el grafo**, evitando ensuciar el contexto del prompt.

## Lista de Bloqueo de Escritura y Seguridad de Secretos

Para evitar fugas accidentales de credenciales en archivos de memoria sincronizables, todas las escrituras a través de `memofs.writeMemory()`, `memofs.core.update()` y `memofs.agentfs.complete()` pasan por el **Control de Bloqueo de Escritura** (`assertWriteAllowed`):

- **Cero Configuración, Siempre Activo:** La lista de bloqueo se ejecuta localmente sin dependencias de red externas.
- **Rechazo Inmediato:** Las escrituras que contienen secretos lanzan un error `MemoryWriteBlockedError` de inmediato; nada se persiste en disco.
- **Enmascaramiento Seguro:** Los mensajes de error y las vistas previas contienen solo fragmentos enmascarados (primeros 3 caracteres + `…` + último carácter, p. ej. `sk-…z`), nunca tokens completos.
