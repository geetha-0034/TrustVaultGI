# Cryptographic Key Management Standard (CKMS-04)
**Owner**: Security Architecture Working Group

## 1. Key Hierarchy
Root of Trust (HSM L4 Quorum M-of-N: 3/5)
  └── Key Encryption Key (KEK) - AES-256-KW
        └── Data Encryption Key (DEK) - AES-256-GCM

## 2. Emergency Revocation (Break-Glass Protocol)
In the event of suspected compromise, two Security Officers execute `tv-vault-cli crypto revoke --epoch current --cascade`.