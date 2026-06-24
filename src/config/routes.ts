// Central route map — update here, use everywhere.
// Avoids magic strings scattered across the codebase.

export const routes = {
  // Public
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",
  resetPassword: "/reset-password",
  verifyEmail: "/verify-email",
  privacy: "/privacy",
  terms: "/terms",

  // Shared
  textbook: (id: string) => `/textbooks/${id}`,
  textbookReader: (id: string) => `/textbooks/${id}/read`,

  // Student (root is the post-login landing)
  student: {
    root: "/student",
    discover: "/student/discover",
    library: "/student/library",
    courses: "/student/courses",
    settings: "/student/settings",
    book: (id: string) => `/student/library/${id}`,
    purchaseCallback: "/student/purchases/callback",
  },

  // Lecturer (root is the post-login landing)
  lecturer: {
    root: "/lecturer",
    textbooks: "/lecturer/books",
    earnings: "/lecturer/earnings",
    settings: "/lecturer/settings",
    profile: "/lecturer/profile",
    newTextbook: "/lecturer/books/new",
    editTextbook: (id: string) => `/lecturer/books/${id}/edit`,
    bookSales: (id: string) => `/lecturer/books/${id}`,
  },

  // Admin (root is the post-login landing)
  admin: {
    root: "/admin",
    users: "/admin/users",
    content: "/admin/content",
    settings: "/admin/settings",
    withdrawals: "/admin/withdrawals",
    revenue: "/admin/revenue",
    lecturers: "/admin/lecturers",
    newLecturer: "/admin/lecturers/new",
    students: "/admin/students",
    student: (id: string) => `/admin/students/${id}`,
    textbooks: "/admin/textbooks",
    setup: "/admin/setup",
    profile: "/admin/profile",
  },

  // API
  api: {
    auth: "/api/auth",
    books: "/api/books",
    book: (id: string) => `/api/books/${id}`,
    users: "/api/users",
    textbooks: "/api/textbooks",
    library: "/api/library",
    purchases: {
      initialize: "/api/purchases/initialize",
      verify: "/api/purchases/verify",
    },
    flutterwaveWebhook: "/api/flutterwave/webhook",
    readingProgress: "/api/reading-progress",
    admin: {
      lecturers: "/api/admin/lecturers",
      lecturerVerify: (id: string) => `/api/admin/lecturers/${id}/verify`,
      userStatus: (id: string) => `/api/admin/users/${id}/status`,
      textbookStatus: (id: string) => `/api/admin/textbooks/${id}/status`,
      impersonate: "/api/admin/impersonate",
      returnToAdmin: "/api/admin/return",
      bootstrap: "/api/admin/bootstrap",
      profile: "/api/admin/profile",
    },
  },
} as const;
