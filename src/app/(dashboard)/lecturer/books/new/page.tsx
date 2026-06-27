"use client";

import { useState, useRef, type ChangeEvent, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronLeft, FileText, Upload, X, ImagePlus } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { routes } from "@/config/routes";
import { cn } from "@/lib/utils/cn";
import { isValidTextbookPrice } from "@/lib/validations/textbook";

// ── Constants ───────────────────────────────────────────────────────────────

const LEVELS = [
  { value: "100", label: "100 Level" },
  { value: "200", label: "200 Level" },
  { value: "300", label: "300 Level" },
  { value: "400", label: "400 Level" },
  { value: "500", label: "500 Level" },
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB
const MAX_COVER_SIZE = 5 * 1024 * 1024; // 5 MB
const COVER_ACCEPT = ["image/jpeg", "image/png", "image/webp"];

// ── Field helpers ───────────────────────────────────────────────────────────

function Label({ children, htmlFor }: { children: React.ReactNode; htmlFor: string }) {
  return (
    <label htmlFor={htmlFor} className="text-[13px] font-medium text-foreground">
      {children}
    </label>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return (
    <p className="text-caption text-destructive" role="alert">
      {message}
    </p>
  );
}

// ── PDF drop zone ───────────────────────────────────────────────────────────

function PdfDropZone({
  file,
  error,
  onFileChange,
  onClear,
}: {
  file: File | null;
  error?: string;
  onFileChange: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onFileChange(picked);
  }

  const formatBytes = (bytes: number) => {
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="pdf-input">PDF File</Label>

      {file ? (
        /* ── Selected file preview ── */
        <div className="flex items-center gap-3 rounded-input border border-border bg-muted/40 px-4 py-3">
          <FileText className="h-5 w-5 flex-shrink-0 text-foreground" aria-hidden />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-foreground">{file.name}</p>
            <p className="text-[12px] text-muted-foreground">{formatBytes(file.size)}</p>
          </div>
          <button
            type="button"
            onClick={onClear}
            className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full hover:bg-muted transition-colors"
            aria-label="Remove file"
          >
            <X className="h-4 w-4 text-muted-foreground" aria-hidden />
          </button>
        </div>
      ) : (
        /* ── Drop zone ── */
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          className={cn(
            "flex flex-col items-center gap-2 rounded-input border-2 border-dashed px-6 py-8",
            "transition-all duration-150",
            dragging
              ? "border-foreground bg-muted/40"
              : error
              ? "border-destructive bg-destructive/5"
              : "border-border bg-background",
          )}
        >
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
            <Upload className="h-5 w-5 text-muted-foreground" aria-hidden />
          </span>
          <div className="text-center">
            <p className="text-[14px] font-medium text-foreground">
              Tap to select PDF
            </p>
            <p className="text-[12px] text-muted-foreground">PDF only · max 50 MB</p>
          </div>
        </button>
      )}

      <input
        ref={inputRef}
        id="pdf-input"
        type="file"
        accept="application/pdf"
        className="sr-only"
        onChange={handleChange}
      />
      <FieldError message={error} />
    </div>
  );
}

// ── Cover image drop zone ────────────────────────────────────────────────────

function CoverDropZone({
  preview,
  error,
  onFileChange,
  onClear,
}: {
  preview: string | null;
  error?: string;
  onFileChange: (f: File) => void;
  onClear: () => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) onFileChange(dropped);
  }

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0];
    if (picked) onFileChange(picked);
    e.target.value = "";
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor="cover-input">
        Book Cover{" "}
        <span className="font-normal text-muted-foreground">(optional)</span>
      </Label>

      {preview ? (
        <div className="flex items-end gap-4">
          <div className="relative w-[100px] flex-shrink-0">
            <div className="overflow-hidden rounded-[16px] bg-muted" style={{ aspectRatio: "3/4" }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={preview} alt="Cover preview" className="h-full w-full object-cover" />
            </div>
            <button
              type="button"
              onClick={onClear}
              className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-border bg-white shadow-sm transition-colors hover:bg-muted"
              aria-label="Remove cover"
            >
              <X className="h-3.5 w-3.5 text-foreground" aria-hidden />
            </button>
          </div>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            className="mb-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            Replace image
          </button>
        </div>
      ) : (
        <>
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center gap-2 rounded-input border-2 border-dashed px-6 py-8",
              "transition-all duration-150",
              dragging
                ? "border-foreground bg-muted/40"
                : error
                ? "border-destructive bg-destructive/5"
                : "border-border bg-background",
            )}
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-muted">
              <ImagePlus className="h-5 w-5 text-muted-foreground" aria-hidden />
            </span>
            <div className="text-center">
              <p className="text-[14px] font-medium text-foreground">Upload cover image</p>
              <p className="text-[12px] text-muted-foreground">JPG, PNG, WEBP · max 5 MB</p>
            </div>
          </button>
          <p className="text-[11px] text-muted-foreground">Recommended: 1200 × 1600 px</p>
        </>
      )}

      <input
        ref={inputRef}
        id="cover-input"
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="sr-only"
        onChange={handleChange}
      />
      <FieldError message={error} />
    </div>
  );
}

// ── Select field ─────────────────────────────────────────────────────────────

function SelectField({
  id,
  label,
  value,
  onChange,
  options,
  placeholder,
  error,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  placeholder: string;
  error?: string;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <Label htmlFor={id}>{label}</Label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          "h-12 w-full rounded-input border bg-input px-4",
          "text-[16px] sm:text-[15px] text-foreground",
          "appearance-none transition-all duration-150",
          "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow",
          value === "" ? "text-muted-foreground" : "text-foreground",
          error ? "border-destructive focus:ring-destructive/20" : "border-border",
        )}
      >
        <option value="" disabled>
          {placeholder}
        </option>
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
      <FieldError message={error} />
    </div>
  );
}

// ── Form state & validation ─────────────────────────────────────────────────

type Fields = {
  title: string;
  description: string;
  department: string;
  level: string;
  courseCode: string;
  price: string;
};

type Errors = Partial<Record<keyof Fields | "pdf" | "cover" | "form", string>>;

function validate(fields: Fields, pdfFile: File | null): Errors {
  const errs: Errors = {};

  if (!fields.title.trim()) errs.title = "Title is required";
  if (!fields.description.trim()) errs.description = "Description is required";
  if (!fields.courseCode.trim()) errs.courseCode = "Course code is required";
  if (!fields.department.trim()) errs.department = "Department is required";
  if (!fields.level) errs.level = "Level is required";

  const price = parseFloat(fields.price);
  if (fields.price === "") {
    errs.price = "Price is required";
  } else if (isNaN(price) || price < 0) {
    errs.price = "Price must be 0 or greater";
  } else if (!isValidTextbookPrice(price)) {
    errs.price = "Price must be a whole Naira amount — Kobo is not supported";
  }

  if (!pdfFile) {
    errs.pdf = "PDF is required";
  } else if (pdfFile.type !== "application/pdf") {
    errs.pdf = "File must be a PDF";
  } else if (pdfFile.size > MAX_FILE_SIZE) {
    errs.pdf = "File must be under 50 MB";
  }

  return errs;
}

// ── Page ────────────────────────────────────────────────────────────────────

export default function NewTextbookPage() {
  const router = useRouter();

  const [fields, setFields] = useState<Fields>({
    title: "",
    description: "",
    department: "",
    level: "",
    courseCode: "",
    price: "",
  });
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [errors, setErrors] = useState<Errors>({});
  const [submitting, setSubmitting] = useState(false);

  function setField(key: keyof Fields, value: string) {
    setFields((prev) => ({ ...prev, [key]: value }));
    // Clear field error on change
    if (errors[key]) setErrors((prev) => ({ ...prev, [key]: undefined }));
  }

  function handlePdfChange(file: File) {
    setPdfFile(file);
    if (errors.pdf) setErrors((prev) => ({ ...prev, pdf: undefined }));
  }

  function handleCoverChange(file: File) {
    if (!COVER_ACCEPT.includes(file.type)) {
      setErrors((prev) => ({ ...prev, cover: "Cover must be JPG, PNG, or WEBP" }));
      return;
    }
    if (file.size > MAX_COVER_SIZE) {
      setErrors((prev) => ({ ...prev, cover: "Cover must be under 5 MB" }));
      return;
    }
    setCoverFile(file);
    setErrors((prev) => ({ ...prev, cover: undefined }));
    const reader = new FileReader();
    reader.onload = (e) => setCoverPreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  function handleCoverClear() {
    setCoverFile(null);
    setCoverPreview(null);
    setErrors((prev) => ({ ...prev, cover: undefined }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setErrors({});

    const errs = validate(fields, pdfFile);
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setSubmitting(true);

    const body = new FormData();
    body.append("title", fields.title.trim());
    body.append("description", fields.description.trim());
    body.append("courseCode", fields.courseCode.trim());
    body.append("department", fields.department.trim());
    body.append("level", fields.level);
    body.append("price", fields.price);
    body.append("pdf", pdfFile!);
    if (coverFile) body.append("cover", coverFile);

    try {
      const res = await fetch("/api/books", { method: "POST", body });
      const data = await res.json();

      if (!res.ok) {
        setErrors({ form: data.error ?? "Something went wrong. Please try again." });
        return;
      }

      router.push(routes.lecturer.textbooks);
      router.refresh();
    } catch {
      setErrors({ form: "Network error. Please try again." });
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-page pt-6 pb-10 max-w-lg mx-auto">

      {/* ── Back nav ────────────────────────────── */}
      <Link
        href={routes.lecturer.textbooks}
        className="inline-flex items-center gap-1 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden />
        My Books
      </Link>

      {/* ── Heading ─────────────────────────────── */}
      <header className="mt-6 mb-8 space-y-1">
        <h1 className="text-title font-bold text-foreground">Upload Textbook</h1>
        <p className="text-[13px] text-muted-foreground">
          Fill in the details and attach a PDF. Your book will be reviewed before going live.
        </p>
      </header>

      {/* ── Form ────────────────────────────────── */}
      <form onSubmit={handleSubmit} noValidate className="space-y-element">

        <Input
          label="Title"
          id="title"
          placeholder="e.g. Introduction to Computer Science"
          value={fields.title}
          onChange={(e) => setField("title", e.target.value)}
          error={errors.title}
          disabled={submitting}
        />

        {/* Description — textarea */}
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="description">Description</Label>
          <textarea
            id="description"
            placeholder="What will students learn from this textbook?"
            value={fields.description}
            onChange={(e) => setField("description", e.target.value)}
            disabled={submitting}
            rows={4}
            className={cn(
              "w-full rounded-input border bg-input px-4 py-3",
              "text-[16px] sm:text-[15px] text-foreground placeholder:text-muted-foreground",
              "resize-none transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-ring/20 focus:border-primary focus:shadow-glow",
              errors.description
                ? "border-destructive focus:ring-destructive/20"
                : "border-border",
            )}
          />
          <FieldError message={errors.description} />
        </div>

        <Input
          label="Course Code"
          id="courseCode"
          placeholder="e.g. PSY202"
          value={fields.courseCode}
          onChange={(e) => setField("courseCode", e.target.value)}
          error={errors.courseCode}
          disabled={submitting}
        />

        <Input
          label="Department"
          id="department"
          placeholder="e.g. Psychology"
          value={fields.department}
          onChange={(e) => setField("department", e.target.value)}
          error={errors.department}
          disabled={submitting}
        />

        <SelectField
          id="level"
          label="Level"
          value={fields.level}
          onChange={(v) => { setField("level", v); }}
          options={LEVELS}
          placeholder="Select level"
          error={errors.level}
        />

        <Input
          label="Price (₦)"
          id="price"
          type="number"
          inputMode="numeric"
          min="0"
          step="1"
          placeholder="0 for free"
          value={fields.price}
          onChange={(e) => setField("price", e.target.value)}
          error={errors.price}
          disabled={submitting}
        />

        <CoverDropZone
          preview={coverPreview}
          error={errors.cover}
          onFileChange={handleCoverChange}
          onClear={handleCoverClear}
        />

        <PdfDropZone
          file={pdfFile}
          error={errors.pdf}
          onFileChange={handlePdfChange}
          onClear={() => { setPdfFile(null); }}
        />

        {/* ── Form-level error ──── */}
        {errors.form && (
          <div className="rounded-input border border-destructive/30 bg-destructive/5 px-4 py-3">
            <p className="text-[13px] text-destructive">{errors.form}</p>
          </div>
        )}

        {/* ── Submit ──── */}
        <div className="pt-2">
          <Button
            type="submit"
            size="lg"
            className="w-full"
            loading={submitting}
            disabled={submitting}
          >
            {submitting ? "Publishing…" : "Publish Textbook"}
          </Button>
        </div>
      </form>
    </div>
  );
}
