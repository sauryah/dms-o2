name: Bug report
description: Create a report to help us improve DMS
labels: ["bug"]
body:
  - type: markdown
    attributes:
      value: |
        Thank you for reporting a bug! Please fill out the form below with as much detail as possible.
  - type: textarea
    id: description
    attributes:
      label: Description
      description: A clear and concise description of what the bug is.
      placeholder: Describe what happened...
    validations:
      required: true
  - type: textarea
    id: reproduction
    attributes:
      label: Steps to Reproduce
      description: Steps to reproduce the behavior.
      placeholder: |
        1. Go to '...'
        2. Click on '...'
        3. See error
    validations:
      required: true
  - type: textarea
    id: expected
    attributes:
      label: Expected Behavior
      description: A clear and concise description of what you expected to happen.
    validations:
      required: true
  - type: textarea
    id: environment
    attributes:
      label: Environment Info
      description: Browser, OS, Docker version, etc.
      placeholder: |
        - OS: Fedora / Ubuntu
        - Docker Version: 24.0.5
        - Browser: Chrome 118
  - type: textarea
    id: logs
    attributes:
      label: Logs or Screenshots
      description: Relevant logs or screenshots showing the error.
      placeholder: Paste any error messages or tracebacks here.
