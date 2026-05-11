# Graph memory

Graph memory represents relationships.

## Node

A node can represent a concept, decision, file, system, package, API, person, or workflow.

## Edge

An edge connects nodes. It can carry type, direction, weight, confidence, metadata, and source references.

## Runtime support

`@tekmemo/graph` provides graph contracts and local graph behavior. TekMemo Cloud exposes project-scoped graph APIs. `@tekmemo/cloud-client` calls those APIs. `@tekmemo/mcp-server` exposes graph tools through runtime adapters.
