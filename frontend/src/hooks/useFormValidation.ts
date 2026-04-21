import { useState, useCallback } from 'react';

interface ValidationRule {
  pattern?: RegExp;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
  custom?: (value: any) => boolean;
  message?: string;
}

interface FormErrors {
  [key: string]: string | null;
}

export function useFormValidation(rules: Record<string, ValidationRule>) {
  const [errors, setErrors] = useState<FormErrors>({});

  const validate = useCallback((name: string, value: any) => {
    const rule = rules[name];
    if (!rule) return null;

    // Required check
    if (rule.required && !value) {
      const error = `${formatFieldName(name)} is required`;
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }

    // Empty value is OK if not required
    if (!value) {
      setErrors(prev => ({ ...prev, [name]: null }));
      return null;
    }

    // Min length check
    if (rule.minLength && String(value).length < rule.minLength) {
      const error = `${formatFieldName(name)} must be at least ${rule.minLength} characters`;
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }

    // Max length check
    if (rule.maxLength && String(value).length > rule.maxLength) {
      const error = `${formatFieldName(name)} must be no more than ${rule.maxLength} characters`;
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }

    // Pattern check
    if (rule.pattern && !rule.pattern.test(String(value))) {
      const error = rule.message || `${formatFieldName(name)} is invalid`;
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }

    // Custom validation
    if (rule.custom && !rule.custom(value)) {
      const error = rule.message || `${formatFieldName(name)} is invalid`;
      setErrors(prev => ({ ...prev, [name]: error }));
      return error;
    }

    // No error
    setErrors(prev => ({ ...prev, [name]: null }));
    return null;
  }, [rules]);

  const validateAll = useCallback((formData: Record<string, any>) => {
    const newErrors: FormErrors = {};
    let hasErrors = false;

    Object.keys(rules).forEach(name => {
      const error = validate(name, formData[name]);
      if (error) {
        newErrors[name] = error;
        hasErrors = true;
      }
    });

    setErrors(newErrors);
    return !hasErrors;
  }, [rules, validate]);

  const clearErrors = useCallback(() => {
    setErrors({});
  }, []);

  const getError = useCallback((name: string) => {
    return errors[name] || null;
  }, [errors]);

  return {
    validate,
    validateAll,
    clearErrors,
    getError,
    errors,
    hasErrors: Object.values(errors).some(e => e !== null),
  };
}

function formatFieldName(name: string): string {
  return name
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
}
