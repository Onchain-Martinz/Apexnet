// Central route map — update here, use everywhere.
// Avoids magic strings scattered across the codebase.

export const routes = {
  // Public
  home: "/",
  login: "/login",
  signup: "/signup",
  forgotPassword: "/forgot-password",

  // Shared
  textbook: (id: string) => `/textbooks/${id}`,
  textbookReader: (id: string) => `/textbooks/${id}/read`,

  // Student (root is the post-login landing)
  student: {
    root: "/student",
    library: "/student/library",
    courses: "/student/courses",
    settings: "/student/settings",
    book: (id: string) => `/student/library/${id}`,
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
  },

  // API
  api: {
    auth: "/api/auth",
    books: "/api/books",
    courses: "/api/courses",
    users: "/api/users",
  },
} as const;
