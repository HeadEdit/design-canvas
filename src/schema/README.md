# Schema boundaries

The project keeps data contracts in three explicit layers:

- `domain/model.ts`: trusted application state and persisted entities. These TypeScript types are used by the Zustand store, graph rules, UI, runners, and export code.
- `schema/ai-wire.ts`: untrusted JSON shapes returned by an OpenAI-compatible model. These Zod schemas describe the wire format only; they intentionally do not contain local IDs or runtime metadata.
- `db/database.ts`: IndexedDB object-store schema. `PersistedChild<T>` adds the repository-only ordering field to child records.

`ai/schemas.ts` is the boundary adapter. It extracts balanced JSON, validates the AI wire schema, applies cross-field invariants (unique names and exact card fields), and converts wire data into trusted domain values. No UI or persistence code should parse model JSON directly.
