function authHeaders(extra) {
  const h = { ...extra };
  const token = getToken();
  if (token) h['Authorization'] = 'Bearer ' + token;
  return h;
}

async function apiGet(url) {
  return fetch(url, { headers: authHeaders() });
}

async function apiPost(url, body) {
  const opts = { method: 'POST', headers: authHeaders({ 'Content-Type': 'application/json' }) };
  if (body !== undefined) opts.body = JSON.stringify(body);
  return fetch(url, opts);
}

async function apiPut(url, body) {
  return fetch(url, {
    method: 'PUT',
    headers: authHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(body),
  });
}

async function apiDel(url) {
  return fetch(url, { method: 'DELETE', headers: authHeaders() });
}
