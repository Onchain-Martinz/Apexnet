# Apex — Architecture Reference

## Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server Components by default |
| Language | TypeScript (strict) | |
| Styling | TailwindCSS + CSS vars | Design tokens in `globals.css` |
| Components | shadcn/ui | Add via `npx shadcn@latest add <component>` |
| Database | PostgreSQL + Prisma ORM | |
| Auth | NextAuth v5 (beta) | JWT session strategy |
| Storage | Cloudflare R2 | Future — file key stored on `Book.fileUrl` |
| Payments | Paystack | Future — `Enrollment.expiresAt` handles access |

---

## Folder Structure

```
src/
├── app/
│   ├── (auth)/              # Login, register, forgot-password
│   │   └── layout.tsx       # Centred auth shell, no nav
│   ├── (marketing)/         # Landing page, pricing, about
│   │   └── layout.tsx       # Full-width marketing shell
│   ├── (dashboard)/         # All authenticated role pages
│   │   ├── layout.tsx       # Bottom tab (mobile) + sidebar (desktop)
│   │   ├── student/
│   │   │   ├── library/     # Browse & read books
│   │   │   ├── courses/     # Enrolled courses
│   │   │   └── settings/
│   │   ├── lecturer/
│   │   │   ├── books/       # Upload & manage books
│   │   │   ├── courses/     # Manage course book lists
│   │   │   └── settings/
│   │   └── admin/
│   │       ├── users/       # User management
│   │       ├── content/     # Book & course moderation
│   │       └── settings/
│   └── api/
│       ├── auth/[...nextauth]/  # NextAuth catch-all
│       ├── books/
│       ├── courses/
│       └── users/
│
├── components/
│   ├── ui/            # shadcn primitives (Button, Card, Input…)
│   ├── layout/        # BottomNav, SideNav, TopBar, PageHeader
│   ├── shared/        # BookCard, CourseCard, Avatar, ProgressRing
│   ├── student/       # Student-specific compound components
│   ├── lecturer/      # Lecturer-specific compound components
│   └── admin/         # Admin-specific compound components
│
├── lib/
│   ├── auth/
│   │   ├── config.ts   # NextAuth config (providers, callbacks)
│   │   └── session.ts  # getSession, requireSession, requireRole
│   ├── db/
│   │   └── index.ts    # Prisma singleton
│   ├── utils/
│   │   ├── cn.ts       # clsx + tailwind-merge
│   │   └── format.ts   # Price, progress, truncate helpers
│   └── validations/
│       └── auth.ts     # Zod schemas for login/register
│
├── config/
│   ├── site.ts         # App name, URL, description
│   └── routes.ts       # Typed central route map
│
├── hooks/              # Custom React hooks (useSession, useDebounce…)
├── types/              # DTO types, extended Prisma types
├── styles/
│   └── globals.css     # CSS design tokens + Tailwind base
│
└── middleware.ts        # Role-based route guard + auth redirects
```

---

## Route Architecture

### Route Groups (Next.js)
Route groups use `(name)` folders to co-locate layouts without affecting the URL.

| Group | URL prefix | Purpose |
|---|---|---|
| `(auth)` | `/login`, `/register` | Unauthenticated pages |
| `(marketing)` | `/` | Public landing page |
| `(dashboard)` | `/student`, `/lecturer`, `/admin` | Authenticated app |

### Auth Flow
1. Unauthenticated user visits `/student/library`
2. Middleware catches it, redirects to `/login`
3. After successful auth, redirected to role home:
   - `STUDENT` → `/student/library`
   - `LECTURER` → `/lecturer/books`
   - `ADMIN` → `/admin/users`

---

## Data Model Summary

```
User (1) ──── (1) StudentProfile
     (1) ──── (1) LecturerProfile
     (1) ──── (1) AdminProfile
     (1) ──── (N) Enrollment
     (1) ──── (N) Bookmark
     (1) ──── (N) ReadingProgress

LecturerProfile (1) ──── (N) Book
LecturerProfile (1) ──── (N) Course

Course (N) ──── (M) Book   [via CourseBook join table]
Course (1) ──── (N) Enrollment
```

---

## Role Capabilities

| Feature | Student | Lecturer | Admin |
|---|---|---|---|
| Browse books | ✓ | ✓ | ✓ |
| Read books | enrolled only | own only | ✓ |
| Upload books | ✗ | ✓ | ✓ |
| Create courses | ✗ | ✓ | ✓ |
| Enroll in courses | ✓ | ✗ | ✗ |
| Manage users | ✗ | ✗ | ✓ |
| Moderate content | ✗ | ✗ | ✓ |

---

## Design Tokens

Design tokens live as CSS custom properties in `src/styles/globals.css`
and are consumed via Tailwind's `theme.extend` in `tailwind.config.ts`.

Key decisions:
- **Base radius**: `0.75rem` (12px) — Apple-style rounded corners
- **Color system**: HSL values for seamless dark mode via `.dark` class
- **Breakpoints**: `sm: 390px` (iPhone 14 width) — mobile truly first
- **Touch targets**: minimum 44×44px via `.touch-target` utility
- **Shadows**: subtle, 2-layer — avoids Material Design heaviness
- **Font**: Geist Sans — clean, modern, legible at small sizes

---

## Adding shadcn Components

```bash
# Install shadcn CLI (one time)
npx shadcn@latest init

# Add components as needed
npx shadcn@latest add button card input label badge sheet
```

Components land in `src/components/ui/` and can be customised freely.

---

## Required npm Packages

### Core (install now)
```bash
npm install next@15 react@19 react-dom@19 typescript
npm install next-auth@beta @auth/prisma-adapter
npm install @prisma/client prisma
npm install clsx tailwind-merge zod
npm install geist
npm install tailwindcss-animate
```

### Dev
```bash
npm install -D tailwindcss postcss autoprefixer
npm install -D @types/node @types/react @types/react-dom
```

### Future (don't install yet)
```bash
# Storage
npm install @aws-sdk/client-s3  # R2 is S3-compatible

# Payments
npm install paystack

# Email
npm install resend
```

---

## Environment Variables

See `.env.example` for the full list. Required to run locally:

```
DATABASE_URL
NEXTAUTH_SECRET
NEXTAUTH_URL
```

Generate `NEXTAUTH_SECRET`:
```bash
openssl rand -base64 32
```

---

## Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Copy env template
cp .env.example .env.local

# 3. Fill in DATABASE_URL and NEXTAUTH_SECRET in .env.local

# 4. Generate Prisma client
npm run db:generate

# 5. Push schema to database (dev)
npm run db:push

# 6. Start dev server
npm run dev
```
