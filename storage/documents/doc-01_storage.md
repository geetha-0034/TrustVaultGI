# SOC-2 Type II Independent Service Auditor's Report
**Audited Entity**: TrustVault Systems Infrastructure
**Assessment Period**: November 1, 2025 - October 31, 2026
**Lead Partner**: Ernst & Vance LLP, Technical Assurance Practice

---

## 1. Scope of the System
This report covers the TrustVault Zero-Trust Document Management platform hosted in distributed tier-IV data centers.
- Security (Common Criteria 6.1 through 6.8)
- Confidentiality (CC 7.1 through 7.4)
- Availability (A 1.1 through 1.3)

## 2. Auditor Opinion
In our opinion, the controls tested operated effectively throughout the examination period.

## 3. Cryptographic Key Management Findings
- All master encryption keys are generated inside FIPS 140-3 Level 4 Hardware Security Modules.
- Ephemeral envelope keys are rotated per document session with authenticated AES-GCM-256.
- Zero key leakage detected across 45,000 synthetic penetration testing transactions.