---
title: Introducción
description: Qué es MemoFS y qué documento leer primero según lo que estés construyendo.
---

# ¿Qué es MemoFS?

MemoFS es un **entorno de ejecución de memoria basado en archivos para agentes de IA**, diseñado por igual para dos caminos: desarrolladores que **utilizan agentes de programación** en su día a día y desarrolladores que **construyen agentes y aplicaciones de IA**.

Todo en esta documentación se ramifica a partir de una pregunta: **¿cómo estás usando MemoFS?**

## ¿Qué camino se adapta a ti?

### Uso de agentes de programación en el día a día
Claude Code, Cursor, Codex, Copilot, opencode o cualquier otro agente de programación con IA pueden leer y escribir memoria de MemoFS automáticamente mediante MCP o ganchos de ciclo de vida (lifecycle hooks); la configuración lleva menos de 5 minutos.

→ **[Encuentra tu agente en los Recetarios](/learn/cookbooks/)**

→ **[Visión General del Servidor MCP](/mcp/)**

### Construcción de agentes y aplicaciones de IA
Importa `@memofs/core` o `@memofs/server` directamente para dotar a agentes personalizados de un entorno de memoria ligero, basado en archivos, sin base de datos externa y con recuperación semántica.

→ **[Visión general de @memofs/core](/es/core/)**

→ **[Referencia de API](/api/core)**

### Autoalojar el servidor
Ejecuta el servidor MemoFS por tu cuenta —en Node.js o Cloudflare Workers— en lugar de usar la oferta alojada en la Nube.

→ **[Visión general de autoalojamiento](/server/)**

### Versión alojada, sin gestión de infraestructura
MemoFS Cloud te proporciona réplica de archivos, un punto final MCP administrado y espacios de trabajo para equipos sin tener que administrar infraestructura.

→ **[MemoFS Cloud](https://memofs.dev)**

## El modelo mental en tres puntos

1. **La memoria son archivos, no una base de datos.** Los hechos principales, notas, historial de conversaciones, índices de recuperación y un grafo de conocimiento residen bajo `.memofs/` como Markdown/JSONL; consulta [Conceptos Fundamentales](/es/core/concepts).
2. **Cada capacidad tiene un mecanismo de respaldo determinista.** La recuperación, la extracción de grafos y la reordenación funcionan sin claves API desde el primer momento (BM25 + análisis basado en reglas); agregar un adaptador LLM/Embedding los potencia; consulta [Configurar Inteligencia](/server/intelligence).
3. **La distribución se adapta al agente.** Los agentes con ganchos de ciclo de vida (Claude Code, Codex, opencode) reciben la memoria inyectada automáticamente; los demás se conectan a través de MCP; consulta [Visión General de MCP](/mcp/).

## Inicio Rápido y Configuración Interactiva

<InteractiveQuickstart />

A partir de aquí, ve al camino anterior que coincida con tus objetivos. Referencia completa de opciones: [Visión General de CLI](/cli/).
