const output = document.getElementById('output');
const statusEl = document.getElementById('status');
const titleEl = document.getElementById('response-title');

const responseSection = document.querySelector('.response');

// Show request information above the API response.
const requestInfo = document.createElement('section');
requestInfo.className = 'request-info';

requestInfo.innerHTML = `
  <div class="request-row">
    <span class="request-label">1. Browser Request URL</span>
    <code id="request-url">Waiting for request...</code>
  </div>

  <div class="request-row">
    <span class="request-label">2. Request Method</span>
    <code id="request-method">-</code>
  </div>

  <div class="request-row">
    <span class="request-label">3. Request Flow</span>
    <code id="request-flow">
      Client → Gateway → Service → PostgreSQL
    </code>
  </div>
`;

responseSection.insertBefore(
  requestInfo,
  responseSection.querySelector('#output')
);

const requestUrlEl = document.getElementById('request-url');
const requestMethodEl = document.getElementById('request-method');
const requestFlowEl = document.getElementById('request-flow');

const serviceDetails = {
  attendance: {
    name: 'oi-attendence',
    flow: 'Client → Gateway → oi-attendence → PostgreSQL'
  },

  core: {
    name: 'oi-core',
    flow: 'Client → Gateway → oi-core → PostgreSQL'
  },

  track: {
    name: 'oi-track',
    flow: 'Client → Gateway → oi-track → PostgreSQL'
  }
};

async function callApi(service, method = 'GET', payload = null) {
  const path = `/api/${service}`;
  const browserUrl = new URL(path, window.location.origin).href;

  const details = serviceDetails[service];

  titleEl.textContent = `${method} ${path}`;

  requestUrlEl.textContent = browserUrl;
  requestMethodEl.textContent = method;
  requestFlowEl.textContent = details.flow;

  statusEl.textContent = 'Requesting...';
  output.textContent = 'Waiting for API response...';

  try {
    const response = await fetch(path, {
      method,
      headers: {
        Accept: 'application/json',
        ...(payload
          ? { 'Content-Type': 'application/json' }
          : {})
      },
      body: payload ? JSON.stringify(payload) : undefined
    });

    const raw = await response.text();

    let data;

    try {
      data = JSON.parse(raw);
    } catch {
      data = raw;
    }

    statusEl.textContent =
      `${response.status} ${response.statusText}`;

    output.textContent =
      typeof data === 'string'
        ? data
        : JSON.stringify(data, null, 2);

  } catch (error) {
    statusEl.textContent = 'Request failed';
    output.textContent = error.message;
  }
}

// Load buttons
document.querySelectorAll('[data-service]').forEach(button => {
  button.addEventListener('click', () => {
    callApi(button.dataset.service);
  });
});

// Add forms
document.querySelectorAll('form[data-form]').forEach(form => {
  form.addEventListener('submit', async event => {
    event.preventDefault();

    const service = form.dataset.form;
    const name = new FormData(form).get('name').trim();

    if (!name) return;

    await callApi(service, 'POST', { name });

    form.reset();
  });
});