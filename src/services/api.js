const FUNIFIER_BASE = 'https://service2.funifier.com/v3';
const API_KEY = import.meta.env.VITE_FUNIFIER_API_KEY;
const BASIC_AUTH = import.meta.env.VITE_FUNIFIER_BASIC_AUTH;

function getToken() {
  return localStorage.getItem('access_token');
}

function authHeaders() {
  const token = getToken();
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
  };
}

function basicHeaders() {
  return {
    'Authorization': BASIC_AUTH,
    'Content-Type': 'application/json',
  };
}

export async function login(username, password) {
  const res = await fetch(`${FUNIFIER_BASE}/auth/token`, {
    method: 'POST',
    headers: basicHeaders(),
    body: JSON.stringify({
      apiKey: API_KEY,
      grant_type: 'password',
      username,
      password,
    }),
  });
  if (!res.ok) throw new Error('Falha na autenticação');
  const data = await res.json();
  localStorage.setItem('access_token', data.access_token);
  return data;
}

export async function createPlayer(player) {
  const res = await fetch(`${FUNIFIER_BASE}/player`, {
    method: 'POST',
    headers: basicHeaders(),
    body: JSON.stringify(player),
  });
  if (!res.ok) throw new Error('Falha ao criar aluno');
  return res.json();
}

export async function listPlayers() {
  const res = await fetch(`${FUNIFIER_BASE}/player`, {
    method: 'GET',
    headers: basicHeaders(),
  });
  if (!res.ok) throw new Error('Falha ao listar alunos');
  return res.json();
}

export async function updatePlayer(id, data) {
  const res = await fetch(`${FUNIFIER_BASE}/player`, {
    method: 'PUT',
    headers: basicHeaders(),
    body: JSON.stringify({ _id: id, ...data }),
  });
  if (!res.ok) throw new Error('Falha ao atualizar aluno');
  return res.json();
}

// ──── Database genérico (Basic auth + __c suffix) ────
const DB_BASE = `${FUNIFIER_BASE}/database`;

function dbCollection(name) {
  return name.endsWith('__c') ? name : `${name}__c`;
}

export async function dbPost(collection, data) {
  const res = await fetch(`${DB_BASE}/${dbCollection(collection)}`, {
    method: 'POST',
    headers: basicHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Falha ao salvar em ${collection}`);
  const text = await res.text();
  return text ? JSON.parse(text) : data;
}

export async function dbGet(collection, query = '') {
  const url = query
    ? `${DB_BASE}/${dbCollection(collection)}?${query}`
    : `${DB_BASE}/${dbCollection(collection)}`;
  const res = await fetch(url, {
    method: 'GET',
    headers: basicHeaders(),
  });
  if (!res.ok) throw new Error(`Falha ao buscar ${collection}`);
  return res.json();
}

export async function dbPut(collection, id, data) {
  const res = await fetch(`${DB_BASE}/${dbCollection(collection)}`, {
    method: 'PUT',
    headers: basicHeaders(),
    body: JSON.stringify({ _id: id, ...data }),
  });
  if (!res.ok) throw new Error(`Falha ao atualizar em ${collection}`);
  const text = await res.text();
  return text ? JSON.parse(text) : { _id: id, ...data };
}

export async function dbDelete(collection, id) {
  const res = await fetch(`${DB_BASE}/${dbCollection(collection)}/${id}`, {
    method: 'DELETE',
    headers: basicHeaders(),
  });
  if (!res.ok) throw new Error(`Falha ao deletar de ${collection}`);
  const text = await res.text();
  return text ? JSON.parse(text) : { _id: id };
}

/**
 * Upsert: tenta PUT (atualizar). Se falhar (doc não existe), faz POST (criar).
 */
export async function dbUpsert(collection, id, data) {
  try {
    return await dbPut(collection, id, data);
  } catch {
    return await dbPost(collection, { _id: id, ...data });
  }
}
