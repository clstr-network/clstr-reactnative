# Clstr Security Doctrine

> Five immutable principles. No exceptions. No overrides. No "just this once."

---

## 1. User data is never collateral damage.

Every row belongs to someone. No query, migration, RPC, or feature may expose, leak, or destroy data belonging to a user who did not explicitly consent. PII (personal_email, verification codes, auth tokens) never appears in public-facing responses. If a function *could* leak — it *will* leak. Block it at the schema level.

## 2. The system rejects unsafe decisions automatically.

Humans forget. CI does not. Every security invariant is enforced by automated gates — not by memory, not by code review alone, not by good intentions. If a migration introduces `USING (true)`, `GRANT ALL`, or an unregistered `SECURITY DEFINER`, the build fails. No human override path exists.

## 3. Privilege is earned per-function, not granted by default.

Every `SECURITY DEFINER` function is registered, audited, and justified. Every RLS policy is scoped to `auth.uid()` unless explicitly exempted. Every elevated operation has `SET search_path`. The default is *deny*. The exception is *documented*.

## 4. Isolation is architectural, not aspirational.

Users see their own domain. Profiles are accessed through RPCs, not raw table reads. Cross-domain visibility requires an explicit gate. Advisory locks protect critical transitions. Race conditions are assumed — and prevented. Tenant boundaries are enforced in SQL, not in JavaScript.

## 5. Every change is diffable, every drift is detectable.

Policy snapshots are stored in version control. Schema changes are linted before merge. SECURITY DEFINER additions require registry entries. If a policy changes shape without a corresponding migration — the build screams. The codebase is an audit trail, not a changelog.

---

*Written for the version of us that ships at 2 AM under pressure.*
*These rules exist because we will forget. The system will not.*
