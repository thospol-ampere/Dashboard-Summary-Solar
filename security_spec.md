# Firestore Security Specification & TDD Spec

## 1. Data Invariants
- A solar project document must be created with a valid string `id` that matches the document ID.
- Each project must have an `ownerId` that strictly matches the authenticated user's `uid` to prevent identity spoofing.
- The `projectName` and `customerName` fields are required strings and cannot exceed 256 characters.
- Project documents can only be created or modified by authenticated users with a verified email or anonymous accounts if explicitly permitted (we will allow general authenticated users).
- Timestamp of creation/update should be validated.

## 2. The "Dirty Dozen" Payloads (Attacks on Identity & Integrity)
We define twelve high-severity threat vector payloads attempting to bypass security checks on `/projects/{projectId}`:

1. **Self-Assigned Identity Spoofing**: Attempting to create a project where the `ownerId` in the body is another user's UID.
2. **Anonymous Access / Unauthenticated Write**: Write payload sent without an active auth token.
3. **Empty Project Title Attack**: Create payload with missing `projectName` or empty string to bypass validation.
4. **Giant Payload Exhaustion**: Setting `projectName` to a 5MB long string.
5. **ID Mismatch Hijacking**: Writing to `/projects/hijacked_id` while specifying `id: "legitimate_id"` in the body.
6. **Path Injection / Poisoning**: Specifying a document ID containing special characters (`../illegal`) to attempt directory traversal.
7. **Unverified User Write**: Attempting a write using an account that has not verified their email (where required).
8. **Malicious Enum Injection**: Setting `projectType` to `"Super-Solar-Space-Farm"`.
9. **Relational Field Tampering**: Attempting to edit `ownerId` on an existing document during an update.
10. **Ghost Fields Injection**: Injecting a field `isVerifiedByAdmin: true` to bypass administrative validation.
11. **Negative Value Manipulation**: Setting `contractValue` to a negative number (`-100000`).
12. **System Generation Spoof**: Trying to set high-privileged status fields without authorization.

## 3. Firestore Rules Structure
The rules enforce:
- Authenticated write permissions.
- Validate incoming data schema using custom helpers.
- Strictly bind project files to the creating user (`ownerId == request.auth.uid`).
