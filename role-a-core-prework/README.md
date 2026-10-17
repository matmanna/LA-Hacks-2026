# Role A core prework (temporary)

Pure-TypeScript implementations of tickets A-01 (case state machine) and A-03
(letter core) from `plans/A-conversation-actions.md`, built against the
`schemas.ts` contract in `plans/00-shared-context.md` section 6. No IO, no
dependency on B's scaffold.

This does not replace B's scaffold. Once `betterbill/packages/core` exists,
copy `src/*` into `betterbill/packages/core/src/` and `test/*` into
`betterbill/packages/core/test/` (same relative layout, should need no
changes), then delete this folder.

Run:

```
npm install
npm test
```
