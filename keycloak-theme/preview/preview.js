// Design sandbox only. No credentials are submitted, stored or sent anywhere.
// Optional QA fixture: register.html?error=email (or password/firstName/termsAccepted).
const previewError = new URLSearchParams(window.location.search).get('error')
if (['email', 'password', 'firstName', 'termsAccepted'].includes(previewError)) {
  const field = document.getElementById(previewError)
  if (field) {
    field.setAttribute('aria-invalid', 'true')
    const message = document.createElement('span')
    message.id = `input-error-${previewError}`
    message.className = 'pf-c-form__helper-text pf-m-error'
    message.textContent = 'Example server validation error. Update this field and try again.'
    field.closest('.form-group').append(message)
  }
}

document.querySelectorAll('[data-preview-form]').forEach(form => {
  form.addEventListener('submit', event => {
    event.preventDefault()
    const output = form.querySelector('output')
    output.textContent = 'Design preview only. Deploy the theme to Keycloak to use this form.'
  })
})

document.querySelectorAll('[data-preview-password-toggle]').forEach(button => {
  button.addEventListener('click', () => {
    const input = document.getElementById(button.getAttribute('aria-controls'))
    const show = input.type === 'password'
    input.type = show ? 'text' : 'password'
    button.setAttribute('aria-label', show ? 'Hide password' : 'Show password')
  })
})

document.querySelector('[data-preview-reset-password]')?.addEventListener('click', event => {
  event.preventDefault()
  document.querySelector('.preview-output').textContent = 'Design preview only. Password reset is handled by Keycloak.'
})

document.querySelector('[data-preview-google-login]')?.addEventListener('click', event => {
  event.preventDefault()
  document.querySelector('.preview-output').textContent = 'Design preview only. Google sign-in is handled by the configured Keycloak identity provider.'
})
