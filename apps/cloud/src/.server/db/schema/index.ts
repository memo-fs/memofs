/**
 * Drizzle schema barrel — re-exports all table definitions and inferred types.
 *
 * Import from here (`~/db/schema`) to access any table, column, or type.
 * Individual modules (`auth`, `control-plane`, `team`) are implementation
 * details; this barrel is the public surface.
 */

export * from "./auth";
export * from "./control-plane";
export * from "./team";
