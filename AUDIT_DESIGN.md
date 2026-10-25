# TrustVault — Cryptographic Audit Log Design (AUDIT_DESIGN.md)

TrustVault incorporates an append-only, tamper-evident cryptographic hash-chain modeled after cryptographic blockchain primitives. This ensures an immutable forensic audit trail capable of withstanding scrutiny in regulatory and compliance environments (such as SOC-2 Type II, ISO 27001, and HIPAA).

---

## 1. Cryptographic Primitive & Hash-Chaining Formula

Every audit event is cryptographically bound to the cryptographic hash of the event immediately preceding it in chronological time.

### Formula
$$H_0 = \text{GENESIS\_HASH} = \texttt{"0000000000000000000000000000000000000000000000000000000000000000"}$$
$$H_n = \text{SHA-256}(H_{n-1} + \text{canonical}(E_n))$$

Where:
- $H_n$ is the 64-character hexadecimal SHA-256 hash of block $n$.
- $H_{n-1}$ is the `prevHash` of the immediately preceding event.
- $\text{canonical}(E_n)$ is the deterministic JSON serialization of the event payload.

---

## 2. Canonical Payload Serialization

To prevent false validation errors caused by arbitrary JSON key ordering, floating point differences, or whitespace variation, the payload fields are serialized in an exact, deterministic canonical order:

```typescript
export function calculateEventHash(prevHash: string, event: Omit<AuditEvent, 'eventHash'>): string {
  const canonicalData = JSON.stringify({
    prevHash,
    id: event.id,
    timestamp: event.timestamp,
    actorId: event.actor.id,
    actorEmail: event.actor.email,
    actorRole: event.actor.role,
    action: event.action,
    result: event.result,
    documentId: event.documentId || null,
    ipAddress: event.ipAddress,
    details: event.details,
    reason: event.reason || null,
  });
  return crypto.createHash('sha256').update(prevHash + canonicalData).digest('hex');
}
```

---

## 3. Audit Event Schema

Each recorded event contains complete forensic attribution:

```typescript
export interface AuditEvent {
  id: string;              // Unique monotonic event identifier (e.g., 'evt-1730000000000')
  timestamp: string;       // UTC ISO-8601 timestamp
  actor: {
    id: string;            // User identifier
    name: string;          // Full display name
    email: string;         // Verified user email
    role: UserRole;        // Role at the time of execution
  };
  action: AuditAction;     // DOCUMENT_UPLOAD | DOCUMENT_VIEW | ACCESS_GRANTED | etc.
  result: 'ALLOWED' | 'DENIED';
  documentId?: string;     // Referenced document ID (if applicable)
  documentTitle?: string;  // Human-readable title
  ipAddress: string;       // Originating client IPv4/IPv6 address
  userAgent: string;       // Browser / client user-agent string
  details: string;         // Forensic narrative describing the operation
  reason?: string;         // Explanatory reason if denied or suspicious
  isSuspicious?: boolean;  // Elevated security alert flag
  prevHash: string;        // SHA-256 hash of the preceding event in the chain
  eventHash: string;       // Canonical SHA-256 hash of this event
}
```

---

## 4. Verification Algorithm (`GET /api/audit/verify-chain`)

The verification engine inspects the entire chain chronologically from Genesis to the current Head block:

1. **Initialize**: Set `expectedPrev = GENESIS_HASH`.
2. **Sequential Iteration**: For each event $E_i$ from $i = 0$ to $N - 1$:
   - **Check Linkage**: Verify that $E_i.\text{prevHash} == \text{expectedPrev}$. If not, return `chainValid: false`, `brokenIndex: i`, `brokenReason: 'Previous hash mismatch'`.
   - **Recompute Hash**: Compute $H_{\text{recomputed}} = \text{calculateEventHash}(E_i.\text{prevHash}, E_i)$.
   - **Check Integrity**: Verify that $E_i.\text{eventHash} == H_{\text{recomputed}}$. If not, return `chainValid: false`, `brokenIndex: i`, `brokenReason: 'Event hash tampering detected'`.
   - **Advance State**: Update $\text{expectedPrev} = E_i.\text{eventHash}$.
3. **Success**: If all $N$ blocks validate without mismatch, return `chainValid: true`, `totalVerifiedBlocks: N`, and the current cryptographic `headHash`.

---

## 5. Tamper Detection Proof

Any out-of-band manipulation of the storage layer (for example, altering a denied access event to hide an intrusion, or deleting an unauthorized download entry) introduces a mathematical discontinuity:

1. Modifying the `details` field of Event #2 alters $\text{canonical}(E_2)$.
2. When the verification engine calculates $\text{SHA-256}(H_1 + \text{canonical}(E_2))$, the resulting hash does not match stored $H_2$.
3. If an attacker recomputes $H_2$, then $E_3.\text{prevHash}$ will no longer match $H_2$.
4. Recomputing the entire subsequent chain requires modifying all subsequent hashes down to the head block, which is immediately exposed by external timestamp registries or cold storage receipts.

---

## 6. Audit Export Capabilities

Platform administrators can export verified audit trails in two formats:
- **CSV Export** (`GET /api/audit/export?format=csv`): Fully escaped comma-separated values compatible with SIEM platforms (Splunk, Datadog, Elastic Security), including `Previous Hash` and `Event Hash` columns.
- **JSON Export** (`GET /api/audit/export?format=json`): Complete structured array formatted for automated compliance ingestion and cryptographic verification tools.
