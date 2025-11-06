# Representative Invitation System Implementation Plan

## Overview
This plan outlines the implementation of a secure representative invitation system where:
1. All users register as visitors (no role selection during registration)
2. Admins can add verified representative emails through the User Management page
3. When an admin adds a representative email, an invitation link is sent
4. Representatives click the link, set their password, and can then log in

---

## Phase 1: Database Schema Changes

### 1.1 Extend Existing User Type
**Use existing collection**: `users`

**Add invitation fields to User interface**:
```typescript
export interface User {
  uid: string;                    // Firebase Auth UID (null for pending invitations)
  email: string;
  displayName: string;
  role: Role;                     // 'admin' | 'representative' | 'visitor'
  country?: string;               // Only for representatives
  createdAt: Date;
  updatedAt: Date;
  
  // NEW: Invitation fields (only present for pending representative invitations)
  invitationToken?: string;        // Unique token for invitation link
  invitationSentAt?: Date;         // When invitation was sent
  acceptedAt?: Date;              // When invitation was accepted (null if pending)
  createdBy?: string;             // Admin UID who created the invitation
  pendingInvitation?: boolean;     // true if invitation not yet accepted
}
```

**Approach**:
- For pending invitations (before Firebase Auth account exists):
  - Store user document using email hash or a temporary ID
  - Include all invitation fields
  - `uid` can be empty/null or use a placeholder
  - `role` set to `'representative'`
  - `pendingInvitation: true`
  
- When invitation is accepted:
  - Create Firebase Auth account (generates real uid)
  - Update existing document OR create new document with uid as document ID
  - Set `acceptedAt`, remove `pendingInvitation`, remove `invitationToken`

**Indexes Required** (if not already exists):
- `email` (for querying by email)
- `country` (for checking availability)
- `role` (already exists)
- `invitationToken` (for lookup during acceptance)

---

## Phase 2: Remove Role Selection from Registration

### 2.1 Update RegisterForm Component
- Remove `RoleSelector` component usage
- Remove `role` state and related logic
- Remove `country` state and related logic
- Set default role to `'visitor'` for all registrations
- Remove role-based validation and country availability checks
- Remove role-based redirects (everyone goes to home page after registration)

### 2.2 Update RoleSelector Component (or remove)
- Since role selection is removed, we can either:
  - Delete the component entirely, OR
  - Keep it for future use but remove from registration

### 2.3 Update Registration Logic
- Simplify `handleEmailRegister` to always create visitor accounts
- Simplify `handleGoogleRegister` to always create visitor accounts
- Remove country availability checks from registration flow

---

## Phase 3: Admin User Management - Add Representative Emails

### 3.1 Update UserManagement Component
**New Features to Add**:
- New section: "Verified Representative Emails"
- Table showing:
  - Email
  - Country
  - Status (Pending/Accepted)
  - Invitation Sent Date
  - Actions (Resend Invitation, Delete)
- Form to add new representative email:
  - Email input
  - Country dropdown (from AFRICAN_COUNTRIES)
  - "Add and Send Invitation" button

### 3.2 Create Server Actions for Representative Invitations
**File**: `app/actions/representative-invitations.ts`

**Functions**:
- `addVerifiedRepresentativeEmail(email: string, country: string)`
  - Validates email is not already in system (check users collection by email)
  - Validates country is not already taken by another representative
  - Generates unique invitation token
  - Creates/updates user document in `users` collection with:
    - Email, role='representative', country
    - invitationToken, invitationSentAt, pendingInvitation=true
    - Use email hash as temporary document ID (or query by email later)
  - Sends invitation email
  - Returns success/error

- `resendInvitationEmail(email: string)`
  - Finds user document by email (query users collection where email==email)
  - Generates new token
  - Updates document (invitationToken, invitationSentAt)
  - Sends new invitation email

- `getVerifiedRepresentativeEmails()`
  - Query users collection where role=='representative'
  - Returns all with invitation status (pendingInvitation, acceptedAt, etc.)

- `deleteVerifiedRepresentativeEmail(email: string)`
  - Finds user document by email
  - Deletes if pendingInvitation is true (not yet accepted)
  - Returns success/error

- `validateInvitationToken(token: string)`
  - Query users collection where invitationToken==token
  - Validates token exists and is not expired
  - Returns email, country, and document data if valid

- `acceptInvitation(token: string, password: string, displayName: string)`
  - Validates token (query users collection)
  - Creates Firebase Auth account with email and password
  - Gets the real uid from Firebase Auth
  - Updates existing user document OR creates new one with uid as document ID:
    - Sets uid, displayName
    - Sets acceptedAt, removes pendingInvitation, removes invitationToken
    - Keeps role='representative' and country
  - If old document exists with email hash ID, delete it
  - Returns success/error

---

## Phase 4: Email Invitation System

### 4.1 Create Email Template
**File**: `lib/email/templates.ts`

**Function**:
- `getRepresentativeInvitationEmailTemplate(email: string, country: string, invitationLink: string)`
  - Returns subject and HTML for invitation email
  - Includes:
    - Welcome message
    - Country they represent
    - Invitation link (button)
    - Security notice
    - Expiration information

### 4.2 Create Email Sending Function
**File**: `lib/email/resend.ts`

**Function**:
- `sendRepresentativeInvitation(email: string, country: string, invitationLink: string)`
  - Uses Resend to send invitation email
  - Returns success/error

### 4.3 Invitation Link Generation
- Generate secure random token (using crypto or uuid)
- Store token in Firestore with email
- Create link: `${NEXT_PUBLIC_APP_URL}/accept-invitation?token=${token}`
- Token should be unique and not guessable

---

## Phase 5: Invitation Acceptance Page

### 5.1 Create Acceptance Page
**File**: `app/(auth)/accept-invitation/page.tsx`

**Features**:
- Extract token from URL query parameter
- Validate token on page load
- Show error if token is invalid/expired
- Form fields:
  - Display Name (pre-filled from email if possible)
  - Password
  - Confirm Password
- Submit button: "Complete Registration"
- On success: redirect to login page with message

### 5.2 Acceptance Flow
1. User clicks invitation link
2. Page validates token
3. If valid, show form
4. User enters password and display name
5. Submit triggers `acceptInvitation` server action
6. Server action:
   - Validates token
   - Creates Firebase Auth account
   - Creates Firestore user document (role='representative', country set)
   - Marks invitation as accepted
   - Returns success
7. Redirect to login with success message

---

## Phase 6: Update Authentication Logic

### 6.1 Update Login Flow
- No changes needed - login works as before
- User role is determined from Firestore user document

### 6.2 Update Registration Flow
- Remove all role selection UI
- Always create visitor accounts
- Remove country selection

### 6.3 Update Middleware (if exists)
- No changes needed - middleware checks role from Firestore

---

## Phase 7: Data Migration (if needed)

### 7.1 Handle Existing Representatives
- Existing representatives already have user documents with uid
- No migration needed - they continue to work as-is
- New system only affects new invitations

---

## Phase 8: Security Considerations

### 8.1 Token Security
- Use cryptographically secure random tokens
- Tokens should be long (at least 32 characters)
- Consider token expiration (e.g., 7 days)
- Single-use tokens (mark as used after acceptance)

### 8.2 Email Validation
- Validate email format before adding
- Check email doesn't already exist in users collection
- Check country isn't already taken

### 8.3 Admin Permissions
- Only admins can add verified representative emails
- Use server-side validation (not just client-side)

### 8.4 Document ID Strategy
- **Pending invitations**: Use email hash or query by email field
- **Accepted invitations**: Use Firebase Auth uid as document ID (standard)
- When accepting, migrate from email-based to uid-based document

---

## Phase 9: UI/UX Improvements

### 9.1 User Management Page
- Clear visual separation between user management and representative email management
- Status indicators (Pending/Accepted)
- Actions for resending invitations
- Delete functionality with confirmation

### 9.2 Invitation Email
- Professional design matching match notification emails
- Clear call-to-action button
- Mobile-friendly

### 9.3 Acceptance Page
- Clear instructions
- Password strength indicator (optional)
- Error handling and display

---

## File Structure Changes

### New Files:
- `app/actions/representative-invitations.ts`
- `app/(auth)/accept-invitation/page.tsx`

### Modified Files:
- `components/auth/RegisterForm.tsx`
- `components/auth/RoleSelector.tsx` (remove or update)
- `components/admin/UserManagement.tsx`
- `lib/email/resend.ts` (add new function)
- `lib/email/templates.ts` (update existing)
- `types/index.ts` (extend User interface with invitation fields)
- `lib/firebase/firestore.ts` (add helper functions for querying by email)

---

## Testing Checklist

- [ ] Admin can add verified representative email
- [ ] Email is sent with correct invitation link
- [ ] Token validation works correctly
- [ ] Representative can accept invitation and set password
- [ ] Representative can log in after acceptance
- [ ] Country uniqueness is enforced
- [ ] Email uniqueness is enforced
- [ ] Invalid/expired tokens are rejected
- [ ] Registration flow no longer shows role selection
- [ ] All new registrations create visitor accounts
- [ ] Existing representatives still work (if migration performed)

---

## Implementation Order

1. **Phase 1**: Database schema and types
2. **Phase 2**: Remove role selection from registration
3. **Phase 3**: Admin UI for adding representative emails
4. **Phase 4**: Email invitation system
5. **Phase 5**: Invitation acceptance page
6. **Phase 6**: Update authentication logic
7. **Phase 7**: Testing and refinement
8. **Phase 8**: Security review

