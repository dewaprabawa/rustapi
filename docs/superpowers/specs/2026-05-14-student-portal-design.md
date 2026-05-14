# Design Spec: Unified Portal & Student Web Experience

## 1. Visual Design Overhaul (Login Screen)
The login screen will be rebuilt using a clean, modern aesthetic, moving away from the "Dark Admin" look to a more accessible "Premium Platform" feel.

### Visual Tokens:
- **Primary Color**: #2563EB (Vivid Blue)
- **Background**: #F8FAFC with subtle radial gradients for depth.
- **Surface**: White with `backdrop-filter: blur(12px)` and `0.5px` border (slate-200).
- **Shadows**: Soft, multi-layered shadows to create elevation.

### UI Components:
- **Social Buttons**: Google, Apple, and Facebook buttons with brand-correct icons and hover transitions.
- **Form Inputs**: Clear icon-prefixed fields with focus-rings and validation states.
- **Button**: High-contrast blue with a subtle shimmer effect on hover.

## 2. Authentication Logic
Update the `AuthContext` and frontend logic to support dual-role entry.

### Frontend Flow:
1. User enters email/password.
2. Frontend calls `api.post("/admin/login", ...)` first.
3. If successful, set role as `admin` and redirect to `/dashboard`.
4. If 401/404, immediately try `api.post("/auth/login", ...)`.
5. If successful, set role as `student` and redirect to `/portal`.
6. Error is only shown if BOTH fail.

## 3. Student Portal Layout
A new layout shell (`StudentLayout`) for users with the Student role.

### Dashboard Structure:
- **Header**: Logo, Streak Counter, XP Bar, Profile Dropdown.
- **Main Area (Grid)**:
    - **Current Course**: Large card with "Resume" button.
    - **Speaking Drills**: Horizontal scroll or grid of available scenarios.
    - **Vocab Master**: Progress on current vocabulary sets.
- **Mobile-First**: Fully responsive grid that scales from mobile browser to desktop.

## 4. Technical Tasks
- [ ] **Auth Context**: Update to handle generic `user` type and `isStudent` flag.
- [ ] **Login UI**: Implement the "Clean Premium" design with Social Login buttons.
- [ ] **Routing**: Add `/portal` routes and `StudentProtectedRoute`.
- [ ] **Student Dashboard**: Scaffold the new student-facing dashboard components.
- [ ] **Backend**: Ensure `/auth/me` and `/admin/me` are handled correctly by the frontend to restore sessions.
