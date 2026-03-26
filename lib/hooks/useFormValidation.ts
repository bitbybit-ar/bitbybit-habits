"use client";

import { useState, useCallback } from "react";

type Validator<T> = (value: T[keyof T], values: T) => string | undefined;

type Validators<T> = {
  [K in keyof T]?: Validator<T>;
};

type Errors<T> = {
  [K in keyof T]?: string;
};

type Touched<T> = {
  [K in keyof T]?: boolean;
};

interface UseFormValidationOptions<T extends Record<string, unknown>> {
  initialValues: T;
  validators?: Validators<T>;
}

export function useFormValidation<T extends Record<string, unknown>>({
  initialValues,
  validators = {},
}: UseFormValidationOptions<T>) {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Errors<T>>({});
  const [touched, setTouched] = useState<Touched<T>>({});
  const [submitted, setSubmitted] = useState(false);

  const validateField = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      const validator = validators[name];
      if (!validator) return undefined;
      return validator(value, { ...values, [name]: value });
    },
    [validators, values]
  );

  const setValue = useCallback(
    (name: keyof T, value: T[keyof T]) => {
      setValues((prev) => ({ ...prev, [name]: value }));
      // Clear error when user starts typing
      if (errors[name]) {
        setErrors((prev) => {
          const next = { ...prev };
          delete next[name];
          return next;
        });
      }
    },
    [errors]
  );

  const handleBlur = useCallback(
    (name: keyof T) => {
      setTouched((prev) => ({ ...prev, [name]: true }));
      const error = validateField(name, values[name]);
      if (error) {
        setErrors((prev) => ({ ...prev, [name]: error }));
      }
    },
    [validateField, values]
  );

  const validateAll = useCallback((): Errors<T> => {
    const allErrors: Errors<T> = {};
    for (const key of Object.keys(validators) as (keyof T)[]) {
      const error = validateField(key, values[key]);
      if (error) allErrors[key] = error;
    }
    setErrors(allErrors);
    setSubmitted(true);
    // Mark all fields as touched
    const allTouched: Touched<T> = {};
    for (const key of Object.keys(values) as (keyof T)[]) {
      allTouched[key] = true;
    }
    setTouched(allTouched);
    return allErrors;
  }, [validateField, validators, values]);

  const reset = useCallback(
    (newValues?: T) => {
      setValues(newValues ?? initialValues);
      setErrors({});
      setTouched({});
      setSubmitted(false);
    },
    [initialValues]
  );

  const fieldProps = useCallback(
    (name: keyof T) => {
      const showError = (touched[name] || submitted) && !!errors[name];
      return {
        value: values[name],
        error: showError ? errors[name] : undefined,
        onChange: (value: T[keyof T]) => setValue(name, value),
        onBlur: () => handleBlur(name),
      };
    },
    [values, errors, touched, submitted, setValue, handleBlur]
  );

  return {
    values,
    errors,
    touched,
    submitted,
    setValue,
    setValues,
    handleBlur,
    validateAll,
    reset,
    fieldProps,
    hasErrors: Object.keys(errors).length > 0,
  };
}
