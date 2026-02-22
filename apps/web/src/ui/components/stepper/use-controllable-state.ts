import { useState, useCallback, useRef, useEffect } from 'react'

/**
 * Supports both controlled and uncontrolled usage.
 * When `value` is provided, the component is controlled.
 * When only `defaultValue` is provided, the component is uncontrolled.
 * `onChange` is called in both cases when the value changes.
 */
export function useControllableState<T>(
  value: T | undefined,
  defaultValue: T,
  onChange?: (value: T) => void,
): [T, (newValue: T) => void] {
  const [internalValue, setInternalValue] = useState(defaultValue)
  const isControlled = value !== undefined
  const currentValue = isControlled ? value : internalValue

  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  }, [onChange])

  const setValue = useCallback(
    (newValue: T) => {
      if (!isControlled) {
        setInternalValue(newValue)
      }
      onChangeRef.current?.(newValue)
    },
    [isControlled],
  )

  return [currentValue, setValue]
}
