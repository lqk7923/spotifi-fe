// Enhance Keycloak's own form without replacing its fields, action or session data.
// If the registration flow has no password (e.g. an identity provider), leave it alone.
function initializeRegistrationSteps() {
  const form = document.getElementById('kc-register-form')
  if (!form || form.dataset.spotifiSteps || !form.querySelector('#password')) return
  const submitArea = form.querySelector('#kc-form-buttons')
  const footer = submitArea?.closest('.form-group')
  const groups = [...form.children].filter(node => node.classList.contains('form-group') && node !== footer)
  if (!submitArea || !groups.some(group => group.querySelector('[name="email"]'))) return

  const vi = document.documentElement.lang.toLowerCase().startsWith('vi')
  const copy = vi ? {
    labels: ['Địa chỉ email', 'Mật khẩu', 'Thông tin', 'Điều khoản'], next: 'Tiếp tục', back: 'Quay lại',
    titles: ['Địa chỉ email', 'Tạo mật khẩu', 'Giới thiệu về bạn', 'Điều khoản & điều kiện'],
    terms: 'Tôi đồng ý. Cùng bật nhạc lên nào!',
    alreadyAccount: 'Bạn đã có tài khoản', login: 'Đăng nhập',
    progress: 'Tiến trình đăng ký', invalid: 'Vui lòng kiểm tra các trường bên dưới.',
    emailRequired: 'Vui lòng nhập địa chỉ email.',
    emailInvalid: 'Email chưa đúng định dạng. Ví dụ: name@domain.com.',
    passwordRequirements: 'Mật khẩu của bạn phải có ít nhất',
    passwordRules: ['1 chữ cái', '1 chữ số hoặc ký tự đặc biệt (ví dụ: # ? ! &)', '10 ký tự'],
    passwordInvalid: 'Mật khẩu cần ít nhất 10 ký tự, gồm 1 chữ cái và 1 chữ số hoặc ký tự đặc biệt.',
    met: 'Đã đáp ứng.', unmet: 'Chưa đáp ứng.',
    step: current => `Bước ${current} / `,
  } : {
    labels: ['Email address', 'Password', 'About you', 'Terms'], next: 'Continue', back: 'Back',
    titles: ['Email address', 'Create a password', 'Tell us about yourself', 'Terms & Conditions'],
    terms: 'I agree. Let’s make some noise!',
    alreadyAccount: 'Already have an account', login: 'Login',
    progress: 'Registration progress', invalid: 'Please check the fields below.',
    emailRequired: 'Enter your email address.',
    emailInvalid: 'Enter a valid email address, like name@domain.com.',
    passwordRequirements: 'Your password must contain at least',
    passwordRules: ['1 letter', '1 number or special character (example: # ? ! &)', '10 characters'],
    passwordInvalid: 'Use at least 10 characters, including 1 letter and 1 number or special character.',
    met: 'Met.', unmet: 'Not met.',
    step: current => `Step ${current} of `,
  }
  const make = (tag, className, text) => {
    const node = document.createElement(tag)
    node.className = className
    if (text) node.textContent = text
    return node
  }
  const loginOptions = form.querySelector('#kc-form-options')
  const loginLink = loginOptions?.querySelector('a')
  if (loginLink) {
    loginLink.textContent = copy.login
    loginOptions.replaceChildren(make('p', 'spotifi-register-login-prompt', copy.alreadyAccount), loginLink)
  }
  const progress = make('div', 'spotifi-register-progress')
  progress.setAttribute('role', 'progressbar')
  progress.setAttribute('aria-label', copy.progress)
  progress.setAttribute('aria-valuemin', '0')
  progress.setAttribute('aria-valuemax', String(copy.titles.length - 1))
  const progressFill = make('span', 'spotifi-register-progress-fill')
  progress.append(progressFill)
  const viewport = make('div', 'spotifi-register-viewport')
  const track = make('div', 'spotifi-register-track')
  const panels = copy.titles.map((title, index) => {
    const panel = make('section', 'spotifi-register-step')
    const heading = make('h2', 'spotifi-register-heading spotifi-register-visually-hidden', title)
    heading.id = `spotifi-register-heading-${index}`
    panel.setAttribute('aria-labelledby', heading.id)
    panel.dataset.registerStage = ['email', 'password', 'profile', 'terms'][index]
    panel.append(heading)
    track.append(panel)
    return panel
  })
  for (const group of groups) {
    const isTermsDocument = group.querySelector('#kc-registration-terms-text')
    const step = group.querySelector('[name="email"]') ? 0
      : group.querySelector('[name="password"], [name="password-confirm"]') ? 1
        : isTermsDocument || group.querySelector('[name="termsAccepted"], .g-recaptcha') ? 3 : 2
    if (isTermsDocument) group.hidden = true
    panels[step].append(group)
  }
  viewport.append(track)

  const controls = make('div', 'spotifi-register-controls')
  const stepNavigation = make('div', 'spotifi-register-step-navigation')
  const back = make('button', 'spotifi-register-back')
  const chevron = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  chevron.setAttribute('viewBox', '0 0 24 24')
  chevron.setAttribute('aria-hidden', 'true')
  const chevronPath = document.createElementNS('http://www.w3.org/2000/svg', 'path')
  chevronPath.setAttribute('d', 'M15 6 9 12 15 18')
  chevronPath.setAttribute('fill', 'none')
  chevronPath.setAttribute('stroke', 'currentColor')
  chevronPath.setAttribute('stroke-width', '2')
  chevronPath.setAttribute('stroke-linecap', 'round')
  chevronPath.setAttribute('stroke-linejoin', 'round')
  chevron.append(chevronPath)
  back.append(chevron)
  back.setAttribute('aria-label', copy.back)
  back.title = copy.back
  const stepStatus = make('span', 'spotifi-register-step-status')
  stepStatus.setAttribute('role', 'status')
  const stepCopy = make('div', 'spotifi-register-step-copy')
  const stepCaption = make('p', 'spotifi-register-step-caption')
  stepCopy.append(stepStatus, stepCaption)
  stepNavigation.append(back, stepCopy)
  const next = make('button', 'pf-c-button pf-m-primary spotifi-register-next', copy.next)
  back.type = next.type = 'button'
  controls.append(next, submitArea)
  const error = make('p', 'spotifi-register-error')
  error.setAttribute('role', 'alert')
  error.hidden = true
  form.prepend(progress, stepNavigation, viewport, error, controls)

  // Keycloak's native registration handler still expects password-confirm.
  // Keep it in the POST, but use the single visible password field as its source.
  const password = form.querySelector('[name="password"]')
  const confirmation = form.querySelector('[name="password-confirm"]')
  if (confirmation) {
    confirmation.closest('.form-group')?.setAttribute('hidden', '')
    confirmation.type = 'hidden'
    confirmation.required = false
  }
  const syncPasswordConfirmation = () => {
    if (confirmation) confirmation.value = password.value
  }
  password.addEventListener('input', syncPasswordConfirmation)
  syncPasswordConfirmation()

  const passwordRequirements = make('div', 'spotifi-password-requirements')
  passwordRequirements.id = 'spotifi-password-requirements'
  const passwordRules = make('ul', 'spotifi-password-rules')
  passwordRules.setAttribute('aria-live', 'polite')
  const ruleChecks = [/\p{L}/u, /[\p{N}\p{P}\p{S}]/u, null]
  const ruleItems = copy.passwordRules.map((text, index) => {
    const item = make('li', 'spotifi-password-rule')
    const marker = make('span', 'spotifi-password-rule-marker')
    marker.setAttribute('aria-hidden', 'true')
    const status = make('span', 'spotifi-register-visually-hidden', copy.unmet)
    item.append(marker, make('span', '', text), status)
    passwordRules.append(item)
    return { item, status, test: ruleChecks[index] }
  })
  passwordRequirements.append(make('p', 'spotifi-password-requirements-title', copy.passwordRequirements), passwordRules)
  password.closest('.form-group').append(passwordRequirements)
  password.setAttribute('aria-describedby', [password.getAttribute('aria-describedby'), passwordRequirements.id].filter(Boolean).join(' '))
  const validatePasswordRequirements = () => {
    let allMet = true
    for (const { item, status, test } of ruleItems) {
      const met = test ? test.test(password.value) : [...password.value].length >= 10
      item.classList.toggle('is-met', met)
      const message = met ? copy.met : copy.unmet
      if (status.textContent !== message) status.textContent = message
      allMet = allMet && met
    }
    password.setCustomValidity(password.value && !allMet ? copy.passwordInvalid : '')
  }
  password.addEventListener('input', validatePasswordRequirements)
  password.addEventListener('change', validatePasswordRequirements)
  validatePasswordRequirements()

  // Reuse Keycloak's native terms field when the registration flow supplies it.
  // Otherwise show the same checkbox; enable the server's Terms and Conditions
  // registration execution as documented to enforce agreement on the server too.
  let terms = form.querySelector('[name="termsAccepted"]')
  if (!terms) {
    const group = make('div', 'form-group spotifi-register-terms')
    terms = document.createElement('input')
    terms.type = 'checkbox'
    terms.id = terms.name = 'termsAccepted'
    const label = make('label', '', copy.terms)
    label.htmlFor = terms.id
    group.append(terms, label)
    panels[3].append(group)
  } else {
    terms.closest('.form-group')?.classList.add('spotifi-register-terms')
    if (terms.labels[0]) terms.labels[0].textContent = copy.terms
  }

  // Keycloak marks required profile fields with an asterisk rather than always
  // using the HTML required attribute. Add browser validation to those fields.
  for (const field of form.querySelectorAll('input:not([type="hidden"]), select, textarea')) {
    if (field.disabled) continue
    const requiredLabel = [...(field.labels || [])].some(label =>
      label.textContent.includes('*') || label.parentElement.querySelector('.required') ||
      [...label.parentElement.childNodes].some(node => node.nodeType === 3 && node.textContent.includes('*')))
    if (requiredLabel || ['email', 'password', 'termsAccepted'].includes(field.name)) field.required = true
    if (field.name === 'email' && field.type === 'text') field.type = 'email'
  }

  form.dataset.spotifiSteps = 'true'
  document.body.classList.add('spotifi-registration')
  form.noValidate = true // Validate all steps explicitly, including off-screen fields.

  const email = form.querySelector('[name="email"]')
  email.placeholder = 'name@domain.com'
  email.autocomplete = 'email'
  email.inputMode = 'email'
  email.autocapitalize = 'none'
  email.spellcheck = false
  const emailHint = make('p', 'spotifi-register-email-error')
  emailHint.id = 'spotifi-register-email-error'
  emailHint.setAttribute('role', 'alert')
  emailHint.hidden = true
  email.after(emailHint)
  email.setAttribute('aria-describedby', [email.getAttribute('aria-describedby'), emailHint.id].filter(Boolean).join(' '))
  let emailTouched = false
  const validateEmail = (showFeedback = false) => {
    const invalidFormat = email.value !== '' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.value)
    email.setCustomValidity(invalidFormat ? copy.emailInvalid : '')
    const message = email.validity.valueMissing ? copy.emailRequired
      : !email.validity.valid ? email.validationMessage : ''
    emailHint.textContent = message
    emailHint.hidden = !showFeedback || !message
    if (showFeedback) {
      if (message) email.setAttribute('aria-invalid', 'true')
      else email.removeAttribute('aria-invalid')
    }
  }
  email.addEventListener('blur', () => { emailTouched = true; validateEmail(true) })
  email.addEventListener('input', () => validateEmail(emailTouched))

  let current = 0
  const lastStep = panels.length - 1
  let animationTimer
  const fieldsIn = panel => [...panel.querySelectorAll('input:not([type="hidden"]), select, textarea')]
  const show = (step, focus = true) => {
    const previous = panels[current]
    clearTimeout(animationTimer)
    panels.forEach(panel => panel.classList.remove('is-leaving'))
    if (step !== current && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      previous.classList.add('is-leaving')
      animationTimer = setTimeout(() => previous.classList.remove('is-leaving'), 300)
    }
    current = step
    document.body.classList.toggle('spotifi-registration-email', current === 0)
    if (footer) footer.hidden = current !== 0
    panels.forEach((panel, index) => {
      const active = index === current
      panel.classList.toggle('is-active', active)
      panel.inert = !active // Inert fields remain part of the final native POST.
      panel.setAttribute('aria-hidden', String(!active))
    })
    track.style.transform = `translateX(-${current * 100}%)`
    progress.hidden = current === 0
    stepNavigation.hidden = current === 0
    stepStatus.textContent = current === 0 ? '' : `${copy.step(current)}${lastStep}`
    stepCaption.textContent = copy.titles[current]
    stepCaption.hidden = current === 0
    progress.setAttribute('aria-valuenow', String(current))
    progress.setAttribute('aria-valuetext', copy.labels[current])
    progressFill.style.transform = `scaleX(${current / lastStep})`
    back.hidden = current === 0
    next.hidden = current === lastStep
    submitArea.hidden = current !== lastStep
    error.hidden = true
    if (focus) fieldsIn(panels[current]).find(field => !field.disabled)?.focus({ preventScroll: true })
  }
  form.addEventListener('input', () => { error.hidden = true })
  const validate = panel => {
    validateEmail(emailTouched)
    syncPasswordConfirmation()
    validatePasswordRequirements()
    return fieldsIn(panel).find(field => !field.disabled && !field.checkValidity())
  }
  const rejectField = field => {
    show(panels.findIndex(panel => panel.contains(field)), false)
    if (field === email) {
      emailTouched = true
      validateEmail(true)
      field.focus({ preventScroll: true })
      return
    }
    error.textContent = field.validationMessage || copy.invalid
    error.hidden = false
    field.focus({ preventScroll: true })
    field.reportValidity()
  }
  const advance = () => {
    const invalid = validate(panels[current])
    if (invalid) rejectField(invalid)
    else if (current < lastStep) show(current + 1)
  }
  back.addEventListener('click', () => show(Math.max(0, current - 1)))
  next.addEventListener('click', advance)
  form.addEventListener('keydown', event => {
    // Enter on a field advances instead of triggering a hidden submit button.
    if (event.key === 'Enter' && !event.isComposing && current < lastStep && event.target.matches('input:not([type="submit"]):not([type="button"])')) {
      event.preventDefault()
      advance()
    }
  })
  form.addEventListener('submit', event => {
    if (current < lastStep) {
      event.preventDefault()
      event.stopImmediatePropagation()
      advance()
      return
    }
    for (const panel of panels) {
      const invalid = validate(panel)
      if (invalid) {
        event.preventDefault()
        event.stopImmediatePropagation()
        rejectField(invalid)
        return
      }
    }
    // Leave the final native submit to Keycloak, including CAPTCHA handlers.
  }, true)
  // A server rejection must reopen the panel with the field-level error.
  const serverError = form.querySelector('[aria-invalid="true"], [id^="input-error-"]')
  const errorStep = panels.findIndex(panel => panel.contains(serverError))
  show(errorStep < 0 ? 0 : errorStep, false)
}

function initializeGoogleLogin(form) {
  const providers = document.getElementById('kc-social-providers')
  const google = providers?.querySelector('#social-google, a:has(.fa-google)')
  if (!google) return

  const vietnamese = document.documentElement.lang.toLowerCase().startsWith('vi')
  google.classList.add('spotifi-google-login')
  const label = google.querySelector('.kc-social-provider-name')
  if (label) label.textContent = vietnamese ? 'Đăng nhập bằng Google' : 'Continue with Google'
  google.setAttribute('aria-label', vietnamese ? 'Đăng nhập bằng Google' : 'Continue with Google')

  // Move Keycloak's original links, preserving loginUrl and its session parameters.
  providers.classList.add('spotifi-login-providers')
  const heading = providers.querySelector('h2')
  if (heading) heading.textContent = vietnamese ? 'hoặc' : 'or'
  const formContainer = document.getElementById('kc-form') || form
  formContainer.after(providers)
}

function initializeLoginTheme() {
  const form = document.getElementById('kc-form-login')
  if (!form) return
  document.body.classList.add('spotifi-login')
  initializeGoogleLogin(form)
  const rememberMe = form.querySelector('input[name="rememberMe"]')
  if (rememberMe) {
    const control = rememberMe.closest('.checkbox') || rememberMe.closest('label') || rememberMe
    control.remove()
    const options = form.querySelector('#kc-form-options')
    if (options && !options.children.length && !options.textContent.trim()) options.remove()
  }
  const registration = document.getElementById('kc-registration')
  const link = registration?.querySelector('a')
  if (!link || registration.querySelector('.spotifi-login-register-prompt')) return
  const prompt = document.createElement('p')
  prompt.className = 'spotifi-login-register-prompt'
  prompt.textContent = "Don't have an account?"
  link.textContent = 'Sign up'
  registration.replaceChildren(prompt, link)
}

function initializeSpotifiTheme() {
  initializeLoginTheme()
  initializeRegistrationSteps()
  const page = document.querySelector('.login-pf-page')
  if (!page || page.querySelector('.spotifi-footer')) return
  const footer = document.createElement('p')
  footer.className = 'spotifi-footer'
  footer.textContent = 'This site is protected by D. and David Martinez'
  footer.append(document.createElement('br'), "Please don't hack it.")
  page.append(footer)
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeSpotifiTheme, { once: true })
else initializeSpotifiTheme()
