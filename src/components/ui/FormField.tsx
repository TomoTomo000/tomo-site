import type { ComponentPropsWithRef, ReactNode } from "react";
import { ChevronDownIcon } from "@/components/ui/Icons";

const fieldClassName = "c-form-field__control";

type FieldLabelProps = {
  htmlFor: string;
  label: string;
  required?: boolean;
};

function FieldLabel({ htmlFor, label, required }: FieldLabelProps) {
  return (
    <label className="c-form-field__label" htmlFor={htmlFor}>
      {label}
      {required ? (
        <span className="c-form-field__required" aria-hidden="true">
          *
        </span>
      ) : null}
    </label>
  );
}

type FieldErrorProps = {
  id: string;
  children?: ReactNode;
};

function FieldError({ id, children }: FieldErrorProps) {
  if (!children) {
    return null;
  }

  return (
    <p id={id} className="c-form-field__error" role="alert">
      {children}
    </p>
  );
}

type FieldCountProps = {
  id: string;
  value: string;
  min: number;
  max: number;
};

export function FieldCount({ id, value, min, max }: FieldCountProps) {
  const count = value.trim().length;
  const invalid = count > 0 && (count < min || count > max);

  return (
    <p
      id={id}
      className={`c-form-field__count ${
        invalid ? "c-form-field__count--invalid" : ""
      }`}
    >
      {count} / {max}文字{min > 1 ? `（${min}文字以上）` : ""}
    </p>
  );
}

type SharedFieldProps = {
  id: string;
  label: string;
  error?: ReactNode;
  info?: ReactNode;
  layout?: "vertical" | "responsive";
};

function FieldLayout({
  id,
  label,
  required,
  layout,
  children,
}: SharedFieldProps & { required?: boolean; children: ReactNode }) {
  return (
    <div
      className={
        layout === "responsive"
          ? "c-form-field c-form-field--responsive"
          : "c-form-field"
      }
    >
      <FieldLabel htmlFor={id} label={label} required={required} />
      <div className="c-form-field__body">{children}</div>
    </div>
  );
}

export type TextFieldProps = Omit<ComponentPropsWithRef<"input">, "id"> &
  SharedFieldProps;

export function TextField({
  id,
  label,
  error,
  info,
  layout = "vertical",
  required,
  className,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextFieldProps) {
  const errorId = `${id}-error`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <FieldLayout id={id} label={label} required={required} layout={layout}>
      <input
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldClassName} ${className ?? ""}`}
      />
      <FieldError id={errorId}>{error}</FieldError>
      {info}
    </FieldLayout>
  );
}

export type SelectFieldProps = Omit<ComponentPropsWithRef<"select">, "id"> &
  SharedFieldProps;

export function SelectField({
  id,
  label,
  error,
  info,
  layout = "vertical",
  required,
  className,
  children,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: SelectFieldProps) {
  const errorId = `${id}-error`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <FieldLayout id={id} label={label} required={required} layout={layout}>
      <div className="c-form-field__select">
        <select
          {...props}
          ref={ref}
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className={`${fieldClassName} c-form-field__control--select ${className ?? ""}`}
        >
          {children}
        </select>
        <ChevronDownIcon className="c-form-field__chevron" />
      </div>
      <FieldError id={errorId}>{error}</FieldError>
      {info}
    </FieldLayout>
  );
}

export type TextareaFieldProps = Omit<ComponentPropsWithRef<"textarea">, "id"> &
  SharedFieldProps;

export function TextareaField({
  id,
  label,
  error,
  info,
  layout = "vertical",
  required,
  className,
  ref,
  "aria-describedby": ariaDescribedBy,
  ...props
}: TextareaFieldProps) {
  const errorId = `${id}-error`;
  const describedBy =
    [ariaDescribedBy, error ? errorId : undefined].filter(Boolean).join(" ") ||
    undefined;

  return (
    <FieldLayout id={id} label={label} required={required} layout={layout}>
      <textarea
        {...props}
        ref={ref}
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy}
        className={`${fieldClassName} c-form-field__control--textarea ${className ?? ""}`}
      />
      <FieldError id={errorId}>{error}</FieldError>
      {info}
    </FieldLayout>
  );
}
