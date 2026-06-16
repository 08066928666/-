import React, { useEffect, useRef, useState } from "react";

export function InlineAdd({ placeholder, onConfirm, onCancel, autoFocus }) {
  const [value, setValue] = useState("");
  const ref = useRef(null);
  useEffect(() => {
    if (autoFocus && ref.current) ref.current.focus();
  }, [autoFocus]);

  const submit = () => {
    if (value.trim()) {
      onConfirm(value.trim());
      setValue("");
    } else {
      onCancel?.();
    }
  };

  return (
    <div className="mobile-inline-add">
      <input
        ref={ref}
        type="text"
        className="mobile-inline-input"
        placeholder={placeholder}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
          if (e.key === "Escape") {
            setValue("");
            onCancel?.();
          }
        }}
      />
      <button type="button" className="mobile-inline-ok" onClick={submit}>
        <i className="fa-solid fa-check" />
      </button>
      <button
        type="button"
        className="mobile-inline-cancel"
        onClick={() => {
          setValue("");
          onCancel?.();
        }}
      >
        <i className="fa-solid fa-xmark" />
      </button>
    </div>
  );
}

export function InlineRename({ initial, onConfirm, onCancel }) {
  const [value, setValue] = useState(initial);
  const ref = useRef(null);
  useEffect(() => {
    if (ref.current) {
      ref.current.focus();
      ref.current.select();
    }
  }, []);

  const submit = () => {
    if (value.trim() && value.trim() !== initial) onConfirm(value.trim());
    else onCancel();
  };

  return (
    <input
      ref={ref}
      type="text"
      className="mobile-inline-input w-full"
      value={value}
      onChange={(e) => setValue(e.target.value)}
      onKeyDown={(e) => {
        if (e.key === "Enter") submit();
        if (e.key === "Escape") onCancel();
      }}
      onBlur={submit}
    />
  );
}
