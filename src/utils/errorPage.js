/**
 * Genera una página HTML de error para peticiones hechas desde el navegador
 * (por ejemplo, cuando la URL de redirección no es válida o no está autorizada).
 */

const escapeHtml = (value) =>
  String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

/**
 * @param {Object} options
 * @param {number} options.status      Código HTTP (400, 403, ...)
 * @param {string} options.title       Título principal
 * @param {string} options.message      Descripción del problema
 * @param {string} [options.code]      Código de error interno (ej. UNAUTHORIZED_REDIRECT_URL)
 * @param {string} [options.detail]    Dato adicional mostrado (ej. la URL recibida)
 * @returns {string} HTML completo
 */
const renderErrorPage = ({ status, title, message, code, detail }) => {
  const safeStatus = escapeHtml(status);
  const safeTitle = escapeHtml(title);
  const safeMessage = escapeHtml(message);

  const codeBlock = code
    ? `<span class="badge">${escapeHtml(code)}</span>`
    : '';

  const detailBlock = detail
    ? `<div class="detail">
            <div class="detail-label">Valor recibido</div>
            <code>${escapeHtml(detail)}</code>
          </div>`
    : '';

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="robots" content="noindex, nofollow">
  <title>${safeStatus} · ${safeTitle}</title>
  <style>
    :root {
      --bg-1: #0f172a;
      --bg-2: #1e293b;
      --card: #ffffff;
      --text: #0f172a;
      --muted: #64748b;
      --danger: #dc2626;
      --danger-soft: #fee2e2;
      --border: #e2e8f0;
    }
    * { box-sizing: border-box; }
    html, body { height: 100%; margin: 0; }
    body {
      font-family: system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
      background: radial-gradient(circle at top, var(--bg-2), var(--bg-1));
      color: var(--text);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 24px;
    }
    .card {
      background: var(--card);
      width: 100%;
      max-width: 520px;
      border-radius: 16px;
      padding: 40px 36px 32px;
      box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.45);
      text-align: center;
      animation: rise 0.4s ease-out;
    }
    @keyframes rise {
      from { opacity: 0; transform: translateY(12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    .icon {
      width: 72px;
      height: 72px;
      margin: 0 auto 20px;
      border-radius: 50%;
      background: var(--danger-soft);
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .icon svg { width: 36px; height: 36px; stroke: var(--danger); }
    .status {
      font-size: 13px;
      font-weight: 600;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--danger);
      margin: 0 0 8px;
    }
    h1 {
      font-size: 24px;
      margin: 0 0 12px;
      line-height: 1.25;
    }
    p.message {
      color: var(--muted);
      font-size: 16px;
      line-height: 1.55;
      margin: 0 0 24px;
    }
    .badge {
      display: inline-block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 12px;
      background: #f1f5f9;
      color: #334155;
      border: 1px solid var(--border);
      border-radius: 999px;
      padding: 4px 12px;
      margin-bottom: 24px;
    }
    .detail {
      text-align: left;
      background: #f8fafc;
      border: 1px solid var(--border);
      border-radius: 10px;
      padding: 14px 16px;
      margin-bottom: 24px;
    }
    .detail-label {
      font-size: 12px;
      font-weight: 600;
      color: var(--muted);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: 6px;
    }
    .detail code {
      display: block;
      font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
      font-size: 13px;
      color: #0f172a;
      word-break: break-all;
    }
    .footer {
      font-size: 13px;
      color: var(--muted);
      border-top: 1px solid var(--border);
      padding-top: 18px;
    }
  </style>
</head>
<body>
  <main class="card" role="alert">
    <div class="icon" aria-hidden="true">
      <svg viewBox="0 0 24 24" fill="none" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="12" y1="8" x2="12" y2="13"></line>
        <line x1="12" y1="16.5" x2="12" y2="16.5"></line>
      </svg>
    </div>
    <p class="status">Error ${safeStatus}</p>
    <h1>${safeTitle}</h1>
    <p class="message">${safeMessage}</p>
    ${codeBlock}
    ${detailBlock}
    <div class="footer">
      Si crees que esto es un error, contacta al administrador de la aplicación que te trajo hasta aquí.
    </div>
  </main>
</body>
</html>`;
};

/**
 * Mensajes amigables para los códigos de error usados en las redirecciones
 * a /auth/failure?error=CODIGO
 */
const FAILURE_MESSAGES = {
  OAUTH_CREDENTIALS_NOT_FOUND: {
    title: 'Aplicación sin credenciales de Google',
    message: 'La aplicación que intentó iniciar sesión todavía no tiene configuradas sus credenciales de Google OAuth en el servicio SSO. Pide al administrador que registre el client_id y client_secret de la aplicación.'
  },
  APP_ID_NOT_FOUND: {
    title: 'Aplicación no registrada',
    message: 'La URL de redirección no pertenece a ninguna aplicación registrada en el SSO.'
  },
  OAUTH_INIT_ERROR: {
    title: 'No se pudo iniciar el login',
    message: 'Ocurrió un problema al preparar la autenticación con Google. Intenta nuevamente en unos minutos.'
  },
  OAUTH_CALLBACK_ERROR: {
    title: 'Error en la respuesta de Google',
    message: 'Google devolvió un error al completar la autenticación. Vuelve a intentarlo.'
  },
  MISSING_PARAMS: {
    title: 'Faltan datos de la sesión',
    message: 'No se encontraron los datos necesarios para completar el login. Vuelve a iniciar el proceso desde la aplicación.'
  },
  AUTH_ERROR: {
    title: 'Fallo en la autenticación',
    message: 'No fue posible completar la autenticación con Google.'
  }
};

const DEFAULT_FAILURE = {
  title: 'Fallo en la autenticación',
  message: 'No fue posible completar la autenticación con Google.'
};

module.exports = { renderErrorPage, escapeHtml, FAILURE_MESSAGES, DEFAULT_FAILURE };
