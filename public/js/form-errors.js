// Shows the server's per-field validation messages next to the matching form inputs.
// Each input needs a sibling <p class="field-error" data-error-for="fieldName"></p>.

export function clearFieldErrors(form) {
  form.querySelectorAll('[data-error-for]').forEach((node) => {
    node.textContent = '';
  });
  form.querySelectorAll('[aria-invalid]').forEach((input) => input.removeAttribute('aria-invalid'));
}

/** @param {Record<string, string>} fields e.g. { email: 'Business email must be a valid email address.' } */
export function showFieldErrors(form, fields) {
  clearFieldErrors(form);
  for (const [name, message] of Object.entries(fields)) {
    const errorNode = form.querySelector(`[data-error-for="${name}"]`);
    if (errorNode) errorNode.textContent = message;
    form.elements[name]?.setAttribute('aria-invalid', 'true');
  }
  const firstInvalid = form.querySelector('[aria-invalid="true"]');
  firstInvalid?.focus();
}

/** Reads a form into a plain object. Checkboxes become true/false. */
export function readForm(form) {
  const values = {};
  for (const input of form.elements) {
    if (!input.name) continue;
    values[input.name] = input.type === 'checkbox' ? input.checked : input.value;
  }
  return values;
}
