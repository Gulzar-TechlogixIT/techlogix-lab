'use strict';

const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const requestUrlEl = document.getElementById('request-url');
const requestMethodEl = document.getElementById('request-method');

async function callApi(service, method, payload = null) {
  const path = `/api/${service}`;
  const url = new URL(path, window.location.origin).href;

  requestUrlEl.textContent = url;
  requestMethodEl.textContent = method;
  statusEl.textContent = 'Loading...';
  output.textContent = 'Sending request...';

  try {
    const response = await fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(payload ? { 'Content-Type': 'application/json' } : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const text = await response.text();

    let data;

    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }

    statusEl.textContent = `${response.status} ${response.statusText}`;

    output.textContent =
      typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);

    return response.ok;

  } catch (error) {
    statusEl.textContent = 'Network Error';
    output.textContent = error.message;

    return false;
  }
}

// GET requests
document.querySelectorAll('button[data-service]').forEach(button => {
  button.addEventListener('click', async () => {
    const service = button.dataset.service;

    button.disabled = true;

    try {
      await callApi(service, 'GET');
    } finally {
      button.disabled = false;
    }
  });
});

// POST requests
document.querySelectorAll('form[data-service]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const service = form.dataset.service;
    const input = form.querySelector('[name="name"]');
    const name = input.value.trim();
    const button = form.querySelector('button');

    if (!name) return;

    button.disabled = true;

    try {
      const success = await callApi(service, 'POST', { name });

      if (success) {
        form.reset();
      }
    } finally {
      button.disabled = false;
    }
  });
});