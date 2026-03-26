"use client";

import React from "react";
import { cn } from "@/lib/utils";
import styles from "./form.module.scss";

// ── FormField ──────────────────────────────────────────────

interface FormFieldProps {
  label?: string;
  required?: boolean;
  error?: string;
  htmlFor?: string;
  className?: string;
  children: React.ReactNode;
}

export function FormField({ label, required, error, htmlFor, className, children }: FormFieldProps) {
  return (
    <div className={cn(styles.field, error && styles.fieldError, className)}>
      {label && (
        <label htmlFor={htmlFor} className={styles.label}>
          {label}
          {required && <span className={styles.required}>*</span>}
        </label>
      )}
      {children}
      {error && (
        <span id={htmlFor ? `${htmlFor}-error` : undefined} className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ── FormInput ──────────────────────────────────────────────

interface FormInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> {
  label?: string;
  required?: boolean;
  error?: string;
  variant?: "default" | "identity" | "security";
  fieldClassName?: string;
  onChange?: (value: string) => void;
}

export function FormInput({
  label,
  required,
  error,
  variant = "default",
  fieldClassName,
  id,
  onChange,
  className,
  ...inputProps
}: FormInputProps) {
  const inputClass = cn(
    styles.input,
    variant === "identity" && styles.inputIdentity,
    variant === "security" && styles.inputSecurity,
    error && styles.inputError,
    className
  );

  return (
    <FormField label={label} required={required} error={error} htmlFor={id} className={fieldClassName}>
      <input
        id={id}
        className={inputClass}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...inputProps}
      />
    </FormField>
  );
}

// ── FormSelect ─────────────────────────────────────────────

interface FormSelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  required?: boolean;
  error?: string;
  fieldClassName?: string;
  onChange?: (value: string) => void;
  children: React.ReactNode;
}

export function FormSelect({
  label,
  required,
  error,
  fieldClassName,
  id,
  onChange,
  className,
  children,
  ...selectProps
}: FormSelectProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id} className={fieldClassName}>
      <select
        id={id}
        className={cn(styles.select, error && styles.inputError, className)}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...selectProps}
      >
        {children}
      </select>
    </FormField>
  );
}

// ── FormTextarea ───────────────────────────────────────────

interface FormTextareaProps extends Omit<React.TextareaHTMLAttributes<HTMLTextAreaElement>, "onChange"> {
  label?: string;
  required?: boolean;
  error?: string;
  fieldClassName?: string;
  onChange?: (value: string) => void;
}

export function FormTextarea({
  label,
  required,
  error,
  fieldClassName,
  id,
  onChange,
  className,
  ...textareaProps
}: FormTextareaProps) {
  return (
    <FormField label={label} required={required} error={error} htmlFor={id} className={fieldClassName}>
      <textarea
        id={id}
        className={cn(styles.textarea, error && styles.inputError, className)}
        aria-invalid={!!error}
        aria-describedby={error && id ? `${id}-error` : undefined}
        onChange={onChange ? (e) => onChange(e.target.value) : undefined}
        {...textareaProps}
      />
    </FormField>
  );
}

// ── FormButton ─────────────────────────────────────────────

interface FormButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  loading?: boolean;
  loadingText?: string;
  variant?: "primary" | "outline";
}

export function FormButton({
  loading,
  loadingText,
  variant = "primary",
  children,
  disabled,
  className,
  ...buttonProps
}: FormButtonProps) {
  return (
    <button
      className={cn(
        variant === "primary" ? styles.submitButton : styles.outlineButton,
        className
      )}
      disabled={disabled || loading}
      {...buttonProps}
    >
      {loading ? (loadingText ?? children) : children}
    </button>
  );
}
