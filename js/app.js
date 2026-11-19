/* =====================================================================
   Pedal Stack – SCB (Sistema de Controle de Bicicletário)
   Protótipo front-end: todas as operações são simuladas no navegador
   (localStorage). Sprints 1, 2 e 3.
   ===================================================================== */

/* ---------- Regras de negócio (ajuste aqui conforme a especificação) ---------- */
const TAXA_BASICA = 10;          // R$ pelas primeiras 2 horas (RF5)
const TAXA_EXTRA = 5;            // R$ a cada 30 min além das 2 horas (RF7)
const LIMITE_MIN = 120;          // minutos incluídos na taxa básica
const AVISO_MIN = 105;           // 1h45 – aviso 15 min antes (US 06)
const MAX_TENTATIVAS_LOGIN = 3;  // tentativas antes do bloqueio (US 02)
const BLOQUEIO_SEGUNDOS = 60;    // duração do bloqueio do login

const MESSAGES = Object.freeze({
  "01": "Cadastro realizado com sucesso! Agora você já pode pedalar com a gente.",
  "02": "Informe um e-mail válido.",
  "03": "A senha deve ter pelo menos 8 caracteres.",
  "04": "Confira os dados do cartão.",
  "05": "Envie uma imagem JPG ou PNG de até 5 MB.",
  "06": "Este campo é obrigatório.",
  "07": "Seu cadastro ainda não foi concluído. Deseja cancelar?",
  "08": "As senhas não coincidem.",
  "09": "CPF inválido. Confira os números digitados.",
  "10": "E-mail ou senha incorretos.",
  "11": "Acesso bloqueado temporariamente por excesso de tentativas. Tente novamente em {s} segundos.",
  "12": "Tranca não encontrada neste totem. Confira o número.",
  "13": "Não há bicicleta nesta tranca. Escolha outra.",
  "14": "Você tem uma taxa pendente. Quite-a no extrato para alugar novamente.",
  "15": "Selecione uma tranca livre para devolver a bicicleta.",
  "16": "Ocorreu um erro inesperado. Tente novamente em instantes."
});

const DEFAULT_TOTENS = [
  { id: "T01", nome: "Praia de Botafogo", endereco: "Praia de Botafogo, 400",
    trancas: { 101: "B-0231", 102: "B-0187", 103: null, 104: "B-0412", 105: null, 106: "B-0099" } },
  { id: "T02", nome: "Largo do Machado", endereco: "Largo do Machado, s/n",
    trancas: { 201: "B-0350", 202: null, 203: "B-0278", 204: null, 205: null } },
  { id: "T03", nome: "Lagoa – Parque dos Patins", endereco: "Av. Borges de Medeiros, 1424",
    trancas: { 301: null, 302: "B-0144", 303: "B-0501", 304: null, 305: "B-0066", 306: null } }
];

const DB_KEY = "pedal-stack-db";
const app = document.querySelector("#app");
const modalRoot = document.querySelector("#modal-root");
const toastRoot = document.querySelector("#toast-root");
const tabbarRoot = document.querySelector("#tabbar-root");

const db = loadDb();
const state = {
  screen: db.session ? "home" : "welcome",
  nationality: "brasileiro",
  documentImage: "",
  account: db.session ? db.accounts[db.session] || null : null,
  statusMessage: "",
  successMessage: "",
  flash: null,           // mensagem na tela seguinte
  selectedTotem: "T01",
  selectedLock: null,
  openEmailId: null,
  lastRentalId: null,
  processing: false      // impede clique duplo (cobrança idempotente)
};
if (db.session && !state.account) { db.session = null; state.screen = "welcome"; }

/* ---------- Ícones ---------- */
const icons = {
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M13.5 2 4.5 13.5h6L9.5 22l9-11.5h-6z"/></svg>',
  arrow: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m15 18-6-6 6-6M9 12h11"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m5 12 4 4L19 6"/></svg>',
  error: '<svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M10 6v5m0 3h.01"/></svg>',
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 11 12 4l9 7"/><path d="M5 10v10h14V10"/></svg>',
  receipt: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/></svg>',
  mail: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></svg>',
  user: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  bell: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 8a6 6 0 1 1 12 0c0 7 3 8 3 8H3s3-1 3-8"/><path d="M10 20a2 2 0 0 0 4 0"/></svg>',
  logout: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 4h4v16h-4M10 17l5-5-5-5M15 12H3"/></svg>',
  dot: '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3" fill="currentColor"/></svg>'
};

/* =====================================================================
   "Banco de dados" simulado (localStorage)
   ===================================================================== */
function freshTotens() { return JSON.parse(JSON.stringify(DEFAULT_TOTENS)); }

function loadDb() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY) || "null");
    if (stored && stored.accounts && stored.totens) return stored;
  } catch (error) {
    console.error("Não foi possível carregar os dados salvos.", error);
  }
  return { accounts: {}, session: null, totens: freshTotens() };
}

function persist() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch (error) {
    console.error("Não foi possível salvar os dados neste navegador.", error);
    state.statusMessage = "Não foi possível salvar os dados neste navegador. Verifique o espaço disponível e tente novamente.";
    return false;
  }
}

function saveAccount(account, previousEmail) {
  if (previousEmail && previousEmail !== account.email) delete db.accounts[previousEmail];
  db.accounts[account.email] = account;
  if (db.session === previousEmail || !db.session) db.session = account.email;
  state.account = account;
  return persist();
}

function newAccountData() {
  return { rentals: [], charges: [], emails: [], loginAttempts: 0, lockedUntil: 0 };
}

const uid = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`.toUpperCase();
const money = value => value.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const dateTime = ts => new Date(ts).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
const timeOnly = ts => new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const totemById = id => db.totens.find(t => t.id === id);
const activeRental = () => state.account?.rentals.find(r => r.status === "ativo") || null;
const pendingCharges = () => (state.account?.charges || []).filter(c => c.status === "pendente");
const unreadEmails = () => (state.account?.emails || []).filter(e => !e.read).length;
const freeBikes = totem => Object.values(totem.trancas).filter(Boolean).length;
const freeLocks = totem => Object.values(totem.trancas).filter(v => !v).length;

function elapsedMinutes(rental) {
  const end = rental.end || Date.now();
  return Math.max(0, (end - rental.start + (rental.offsetMs || 0)) / 60000);
}

function extraFee(minutes) {
  if (minutes <= LIMITE_MIN) return 0;
  return Math.ceil((minutes - LIMITE_MIN) / 30) * TAXA_EXTRA;
}

function formatDuration(minutes, withSeconds = false) {
  const total = Math.floor(minutes * 60);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (withSeconds) return [h, m, s].map(n => String(n).padStart(2, "0")).join(":");
  return h ? `${h}h${String(m).padStart(2, "0")}` : `${m} min`;
}

function sendEmail(subject, intro, rows, extra = "") {
  state.account.emails.unshift({ id: uid("EM"), subject, intro, rows, extra, date: Date.now(), read: false });
}

/* =====================================================================
   Componentes de interface
   ===================================================================== */
function brand() {
  return `<span class="brand-mark">${icons.bolt}</span><span>Pedal Stack</span>`;
}

function backLink(target = "welcome") {
  return `<a class="back-link" href="#" data-screen="${target}">${icons.arrow} Voltar</a>`;
}

function pageTop() {
  return `<header class="page-top">
    <a class="brand" href="#" data-screen="home">${brand()}</a>
    <button class="icon-btn" data-action="logout">${icons.logout} Sair</button>
  </header>`;
}

function field(name, label, options = {}) {
  const { type = "text", value = "", placeholder = "", autocomplete = "", required = true, readonly = false, hint = "", inputmode = "" } = options;
  const escaped = escapeHtml(value);
  return `<div class="field" data-field="${name}">
    <label for="${name}">${label}</label>
    <input id="${name}" name="${name}" type="${type}" value="${escaped}" placeholder="${placeholder}" ${inputmode ? `inputmode="${inputmode}"` : ""} ${autocomplete ? `autocomplete="${autocomplete}"` : ""} ${required ? "required" : ""} ${readonly ? "readonly" : ""}>
    ${hint ? `<p class="field-hint">${hint}</p>` : ""}
    <p class="field-error" hidden>${icons.error}<span></span></p>
  </div>`;
}

function passwordField(name, label, autocomplete) {
  return `<div class="field" data-field="${name}">
    <label for="${name}">${label}</label>
    <div class="password-wrap">
      <input id="${name}" name="${name}" type="password" autocomplete="${autocomplete}" required>
      <button class="reveal-button" type="button" data-reveal="${name}" aria-label="Mostrar senha">Mostrar</button>
    </div>
    <p class="field-error" hidden>${icons.error}<span></span></p>
  </div>`;
}

function nationalitySelect(readonly = false) {
  return `<div class="field field-full" data-field="nationality">
    <label for="nationality">Nacionalidade</label>
    <select id="nationality" name="nationality" ${readonly ? "disabled" : ""}>
      <option value="brasileiro" ${state.nationality === "brasileiro" ? "selected" : ""}>Brasileiro</option>
      <option value="estrangeiro" ${state.nationality === "estrangeiro" ? "selected" : ""}>Estrangeiro</option>
    </select>
  </div>`;
}

function documentFields(readonly = false) {
  const savedDocument = readonly ? state.account : null;
  if (state.nationality === "estrangeiro") {
    return `<div class="field" data-field="passport">
      <label for="passport">Número do passaporte</label>
      <input id="passport" name="passport" value="${escapeHtml(savedDocument?.passport || "")}" autocomplete="off" ${readonly ? "readonly" : "required"}>
      <p class="field-error" hidden>${icons.error}<span></span></p>
    </div>${field("issuingCountry", "País de emissão", { value: savedDocument?.issuingCountry || "", readonly })}`;
  }
  return field("cpf", "CPF", {
    value: savedDocument?.cpf || "",
    placeholder: "000.000.000-00",
    inputmode: "numeric",
    hint: readonly ? "O documento não pode ser alterado." : "",
    readonly
  });
}

function personalFields({ editing = false } = {}) {
  const account = state.account || {};
  return `<div class="section-title">Dados pessoais</div>
    <div class="form-grid">
      ${nationalitySelect(editing)}
      ${field("fullName", "Nome completo", { value: editing ? account.fullName : "", autocomplete: "name" })}
      ${field("email", "E-mail", { type: "email", value: editing ? account.email : "", autocomplete: "email" })}
      ${editing ? "" : passwordField("password", "Senha", "new-password")}
      ${editing ? "" : passwordField("confirmPassword", "Confirmar senha", "new-password")}
      <div id="identity-fields" class="form-grid field-full">${documentFields(editing)}</div>
    </div>
    ${editing ? "" : `<div class="section-title">Documento</div>
      <div class="field field-full" data-field="documentFile">
        <span class="field-label">Foto do documento</span>
        <div class="upload-box">
          <img class="preview-image" id="document-preview" src="${state.documentImage}" alt="Prévia do documento" ${state.documentImage ? "" : "hidden"}>
          <label class="upload-trigger" for="documentFile">Enviar foto</label>
          <input id="documentFile" name="documentFile" type="file" accept="image/jpeg,image/png">
          <span class="upload-copy" id="upload-copy">${state.documentImage ? "Imagem selecionada" : "JPG ou PNG · até 5 MB"}</span>
        </div>
        <p class="field-error" hidden>${icons.error}<span></span></p>
      </div>`}`;
}

function cardFields() {
  return `<div class="section-title">Cartão</div>
    <div class="form-grid">
      ${field("cardNumber", "Número do cartão", { placeholder: "0000 0000 0000 0000", autocomplete: "cc-number", inputmode: "numeric" })}
      ${field("cardholder", "Nome no cartão", { value: "", autocomplete: "cc-name" })}
      ${field("expiry", "Validade", { placeholder: "MM/AA", autocomplete: "cc-exp", inputmode: "numeric" })}
      ${field("cvv", "CVV", { placeholder: "000", autocomplete: "cc-csc", inputmode: "numeric" })}
    </div>`;
}

function alertBox(type, html) {
  const icon = type === "ok" ? icons.check : icons.error;
  return `<div class="alert alert-${type}" role="${type === "error" ? "alert" : "status"}">${icon}<div>${html}</div></div>`;
}

function flashBox() {
  if (!state.flash) return "";
  const html = alertBox(state.flash.type, escapeHtml(state.flash.text));
  state.flash = null;
  return html;
}

function pendingBanner() {
  const pending = pendingCharges();
  if (!pending.length) return "";
  const total = pending.reduce((sum, c) => sum + c.value, 0);
  return alertBox("warning", `<b>Taxa pendente de ${money(total)}.</b> Novos aluguéis ficam bloqueados até a quitação. <button class="btn-link" data-screen="statement">Resolver no extrato</button>`);
}

function renderTabbar() {
  const logged = state.account && !["welcome", "register", "success", "login"].includes(state.screen);
  document.body.classList.toggle("logged", Boolean(logged));
  if (!logged) { tabbarRoot.innerHTML = ""; return; }
  const tab = (screen, icon, label, extra = "") => {
    const active = state.screen === screen || (screen === "home" && ["rent", "trip", "return", "receipt", "rent-failed"].includes(state.screen))
      || (screen === "profile" && ["edit-profile", "edit-card"].includes(state.screen))
      || (screen === "inbox" && state.screen === "email");
    return `<button class="tab ${active ? "is-active" : ""}" data-screen="${screen}" aria-label="${label}">${icon}<span>${label}</span>${extra}</button>`;
  };
  const unread = unreadEmails();
  tabbarRoot.innerHTML = `<div class="tabbar" role="navigation" aria-label="Menu do aplicativo">
    ${tab("home", icons.home, "Início")}
    ${tab("statement", icons.receipt, "Extrato")}
    ${tab("inbox", icons.mail, "E-mails", unread ? `<span class="badge">${unread}</span>` : "")}
    ${tab("profile", icons.user, "Perfil")}
  </div>`;
}

/* =====================================================================
   Telas
   ===================================================================== */
const screens = {
  welcome() {
    return `<section class="welcome-layout">
      <div class="welcome-copy">
        <a class="brand" href="#" data-screen="welcome">${brand()}</a>
        <h1>A cidade é sua. <em>Pedale.</em></h1>
        <p>Seu próximo caminho começa aqui. Alugue uma bicicleta em qualquer totem da cidade e pague só o que usar — sem surpresas.</p>
        <div class="welcome-actions">
          <button class="btn btn-primary btn-block" data-screen="register">Criar conta</button>
          <a class="text-link" href="#" data-screen="login">Já tenho conta — Entrar</a>
        </div>
      </div>
      <div class="welcome-art">
        <img src="./img/bike-removebg-preview.png" alt="Ilustração de uma bicicleta clássica">
        <span class="art-note">Encontre seu ritmo</span>
      </div>
    </section>`;
  },

  register() {
    state.nationality = "brasileiro";
    return `<section class="panel panel-wide">
      ${backLink()}
      <header class="panel-header"><h1>Criar conta</h1><p>Preencha seus dados e prepare-se para pedalar. Seu cartão é validado na hora.</p></header>
      <form id="register-form" novalidate>
        ${personalFields()}
        ${cardFields()}
        <p class="form-status" role="alert">${escapeHtml(state.statusMessage)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Cadastrar</button>
          <button class="btn-link" type="button" data-action="cancel-register">Cancelar</button>
        </div>
      </form>
    </section>`;
  },

  success() {
    return `<section class="success-layout">
      <div class="success-icon">${icons.check}</div>
      <div class="success-copy">
        <h1>Deu pedal!</h1>
        <p>${MESSAGES["01"]}</p>
        <button class="btn btn-primary" data-screen="login">Entrar</button>
      </div>
    </section>`;
  },

  login() {
    return `<section class="panel">
      ${backLink()}
      <header class="panel-header"><h1>Que bom ter você de volta.</h1><p>Entre na sua conta para continuar.</p></header>
      <form id="login-form" novalidate>
        <div class="form-grid">
          ${field("loginEmail", "E-mail", { type: "email", autocomplete: "email" })}
          ${passwordField("loginPassword", "Senha", "current-password")}
        </div>
        <p class="form-status" role="alert">${escapeHtml(state.statusMessage)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Entrar</button>
          <a class="text-link" href="#" data-screen="register">Criar conta</a>
        </div>
      </form>
      <div class="demo-box">
        <p class="demo-title">Modo demonstração</p>
        <div class="demo-actions"><button type="button" data-action="demo-login">Entrar com conta de demonstração</button></div>
      </div>
    </section>`;
  },

  home() {
    const firstName = escapeHtml((state.account?.fullName || "ciclista").trim().split(/\s+/)[0]);
    const rental = activeRental();
    const blocked = pendingCharges().length > 0;
    let cta;
    if (rental) {
      cta = `<p>Você está pedalando a bicicleta <b>${escapeHtml(rental.bike)}</b> desde ${timeOnly(rental.start)}.</p>
        <button class="btn btn-primary" data-screen="trip">Ver viagem em andamento</button>`;
    } else {
      cta = `<p>Retire uma bicicleta em qualquer totem. Até 2 horas por ${money(TAXA_BASICA)}, cobrado uma única vez.</p>
        <button class="btn btn-primary" data-screen="rent" ${blocked ? "disabled" : ""}>Alugar bicicleta</button>`;
    }
    return `<section class="page">
      ${pageTop()}
      ${flashBox()}
      ${pendingBanner()}
      <div class="home-card">
        <div>
          <p class="eyebrow">${rental ? "Viagem em andamento" : "Pedal Stack"}</p>
          <h1>Olá, ${firstName}!</h1>
          ${cta}
        </div>
        <img class="home-bike" src="./img/bike-removebg-preview.png" alt="Ilustração de uma bicicleta">
      </div>
    </section>`;
  },

  rent() {
    if (activeRental()) { state.screen = "trip"; return screens.trip(); }
    const blocked = pendingCharges().length > 0;
    const totemOptions = db.totens.map(t => `<label class="totem-option">
        <input type="radio" name="totem" value="${t.id}" ${state.selectedTotem === t.id ? "checked" : ""}>
        <span><span class="totem-name">${escapeHtml(t.nome)}</span><br><span class="totem-meta">Totem ${t.id} · ${escapeHtml(t.endereco)}</span></span>
        <span class="totem-count">${freeBikes(t)} bikes</span>
      </label>`).join("");
    return `<section class="page">
      ${backLink("home")}
      <header class="panel-header"><h1>Alugar bicicleta</h1><p>Escolha o totem e digite o número da tranca onde está a bicicleta.</p></header>
      ${blocked ? alertBox("error", MESSAGES["14"]) : ""}
      <form id="rent-form" class="card" novalidate>
        <div class="section-title">1. Totem</div>
        <div class="totem-list">${totemOptions}</div>
        <div class="section-title">2. Tranca</div>
        <div class="form-grid">
          ${field("lockNumber", "Número da tranca", { placeholder: "Ex.: 101", inputmode: "numeric", hint: lockHint(state.selectedTotem) })}
        </div>
        <p class="form-status" role="alert"></p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit" ${blocked ? "disabled" : ""}>Continuar</button>
          <button class="btn-link" type="button" data-screen="home">Cancelar</button>
        </div>
        <div class="demo-box">
          <p class="demo-title">Modo demonstração</p>
          <label class="demo-check"><input type="checkbox" name="simulateLockFail"> Simular falha da tranca (testa o estorno automático)</label>
        </div>
      </form>
    </section>`;
  },

  "rent-failed"() {
    const charge = state.account.charges.find(c => c.rentalId === state.lastRentalId);
    return `<section class="success-layout">
      <div class="success-icon is-error">${icons.error}</div>
      <div class="success-copy">
        <h1>A tranca não liberou.</h1>
        <p>Não se preocupe: o valor de ${money(charge?.value || TAXA_BASICA)} foi <b>estornado automaticamente</b> no seu cartão. Tente outra tranca.</p>
        <button class="btn btn-primary" data-screen="rent">Tentar outra tranca</button>
        <p class="op-id">Operação ${escapeHtml(charge?.opId || "")}</p>
      </div>
    </section>`;
  },

  trip() {
    const rental = activeRental();
    if (!rental) { state.screen = "home"; return screens.home(); }
    const totem = totemById(rental.totemOut);
    return `<section class="page">
      ${pageTop()}
      ${flashBox()}
      <div class="card">
        <p class="eyebrow">Viagem em andamento</p>
        <div class="timer" id="trip-timer">00:00:00</div>
        <p class="muted">Tempo de uso</p>
        <div class="progress" id="trip-progress"><span style="width:0%"></span></div>
        <div class="progress-legend"><span>Início ${timeOnly(rental.start)}</span><span>2h incluídas na taxa básica</span></div>
        <p class="extra-estimate" id="trip-extra" hidden></p>
        <dl class="trip-grid">
          <div class="kv"><dt>Bicicleta</dt><dd>${escapeHtml(rental.bike)}</dd></div>
          <div class="kv"><dt>Retirada</dt><dd>${escapeHtml(totem?.nome || rental.totemOut)} · ${rental.lockOut}</dd></div>
        </dl>
        <div class="form-actions">
          <button class="btn btn-primary btn-block" data-screen="return">Devolver bicicleta</button>
        </div>
        <div class="demo-box">
          <p class="demo-title">Modo demonstração · avançar o tempo</p>
          <div class="demo-actions">
            <button type="button" data-action="advance" data-minutes="15">+15 min</button>
            <button type="button" data-action="jump" data-minutes="105">Ir para 1h45</button>
            <button type="button" data-action="jump" data-minutes="150">Ir para 2h30</button>
          </div>
        </div>
      </div>
    </section>`;
  },

  return() {
    const rental = activeRental();
    if (!rental) { state.screen = "home"; return screens.home(); }
    const totem = totemById(state.selectedTotem) || db.totens[0];
    const totemOptions = db.totens.map(t => `<label class="totem-option">
        <input type="radio" name="totem" value="${t.id}" ${totem.id === t.id ? "checked" : ""}>
        <span><span class="totem-name">${escapeHtml(t.nome)}</span><br><span class="totem-meta">Totem ${t.id}</span></span>
        <span class="totem-count">${freeLocks(t)} livres</span>
      </label>`).join("");
    const locks = Object.entries(totem.trancas).map(([n, bike]) => bike
      ? `<button type="button" class="lock is-busy" disabled>${n}<small>ocupada</small></button>`
      : `<button type="button" class="lock ${state.selectedLock === n ? "is-selected" : ""}" data-action="select-lock" data-lock="${n}">${n}<small>livre</small></button>`).join("");
    const minutes = elapsedMinutes(rental);
    const fee = extraFee(minutes);
    return `<section class="page">
      ${backLink("trip")}
      <header class="panel-header"><h1>Devolver bicicleta</h1><p>Encaixe a bicicleta em qualquer tranca livre.</p></header>
      <form id="return-form" class="card" novalidate>
        <div class="section-title">1. Totem</div>
        <div class="totem-list">${totemOptions}</div>
        <div class="section-title">2. Tranca livre</div>
        <div class="lock-grid">${locks}</div>
        <p class="muted" style="margin-top:16px">Tempo de uso: <b>${formatDuration(minutes)}</b> · ${fee ? `taxa extra de <b>${money(fee)}</b>` : "sem taxa extra"}</p>
        <p class="form-status" role="alert"></p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Confirmar devolução</button>
          <button class="btn-link" type="button" data-screen="trip">Cancelar</button>
        </div>
        <div class="demo-box">
          <p class="demo-title">Modo demonstração</p>
          <label class="demo-check"><input type="checkbox" name="simulateCardDecline"> Simular cartão recusado na taxa extra</label>
        </div>
      </form>
    </section>`;
  },

  receipt() {
    const rental = state.account.rentals.find(r => r.id === state.lastRentalId);
    if (!rental) { state.screen = "home"; return screens.home(); }
    const extra = state.account.charges.find(c => c.rentalId === rental.id && c.type === "extra");
    const basic = state.account.charges.find(c => c.rentalId === rental.id && c.type === "basica");
    let feeBox = alertBox("ok", "Devolução dentro das 2 horas: <b>nenhuma taxa extra</b>.");
    if (extra?.status === "paga") feeBox = alertBox("ok", `Taxa extra de <b>${money(extra.value)}</b> cobrada no cartão final ${escapeHtml(state.account.cardLast4)}.`);
    if (extra?.status === "pendente") feeBox = alertBox("warning", `Não conseguimos cobrar a taxa extra de <b>${money(extra.value)}</b>. A devolução foi concluída e a taxa ficou <b>pendente</b>. Novos aluguéis ficam bloqueados até a quitação.`);
    return `<section class="page">
      ${pageTop()}
      <div class="card">
        <div class="success-icon" style="margin:0 0 16px">${icons.check}</div>
        <h2>Devolução confirmada!</h2>
        <p class="muted">Obrigado por pedalar com a gente. Enviamos o resumo para ${escapeHtml(state.account.email)}.</p>
        ${feeBox}
        <dl class="receipt-grid">
          <div class="kv"><dt>Tempo de uso</dt><dd>${formatDuration(rental.minutes)}</dd></div>
          <div class="kv"><dt>Bicicleta</dt><dd>${escapeHtml(rental.bike)}</dd></div>
          <div class="kv"><dt>Retirada</dt><dd>${escapeHtml(totemById(rental.totemOut)?.nome || "")} · ${rental.lockOut}</dd></div>
          <div class="kv"><dt>Devolução</dt><dd>${escapeHtml(totemById(rental.totemIn)?.nome || "")} · ${rental.lockIn}</dd></div>
          <div class="kv"><dt>Taxa básica</dt><dd>${money(basic?.value || 0)}</dd></div>
          <div class="kv"><dt>Taxa extra</dt><dd>${extra ? `${money(extra.value)} · ${extra.status}` : money(0)}</dd></div>
        </dl>
        <div class="form-actions">
          <button class="btn btn-primary" data-screen="statement">Ver extrato</button>
          <button class="btn-link" data-screen="home">Voltar ao início</button>
        </div>
      </div>
    </section>`;
  },

  statement() {
    const charges = [...state.account.charges].sort((a, b) => b.createdAt - a.createdAt);
    const paid = charges.filter(c => c.status === "paga").reduce((s, c) => s + c.value, 0);
    const pending = charges.filter(c => c.status === "pendente").reduce((s, c) => s + c.value, 0);
    const items = charges.map(c => `<li class="list-item">
        <div>
          <div class="list-title">${escapeHtml(c.description)}</div>
          <div class="list-sub">${dateTime(c.createdAt)}${c.attempts > 1 ? ` · ${c.attempts} tentativas` : ""}</div>
          <span class="chip chip-${c.status}">${c.status}</span>
        </div>
        <div class="list-value">${money(c.value)}</div>
        ${c.status === "pendente" ? `<div class="list-actions"><button class="btn btn-primary" data-action="retry-charge" data-id="${c.id}">Pagar agora</button></div>` : ""}
      </li>`).join("");
    return `<section class="page">
      ${pageTop()}
      <header class="panel-header"><h1>Extrato</h1><p>Todas as suas cobranças, com o status de cada uma.</p></header>
      ${flashBox()}
      <div class="summary">
        <div class="kv"><dt>Total pago</dt><dd>${money(paid)}</dd></div>
        <div class="kv"><dt>Pendente</dt><dd class="${pending ? "is-pending" : ""}">${money(pending)}</dd></div>
      </div>
      <div class="card">
        ${charges.length ? `<ul class="list">${items}</ul>` : `<p class="empty">Você ainda não tem cobranças. Que tal o primeiro pedal?</p>`}
        ${pending ? `<div class="demo-box">
          <p class="demo-title">Modo demonstração</p>
          <label class="demo-check"><input type="checkbox" id="simulate-retry-fail"> Simular nova recusa do cartão</label>
        </div>` : ""}
      </div>
    </section>`;
  },

  inbox() {
    const emails = state.account.emails;
    const items = emails.map(e => `<button class="mail-item ${e.read ? "" : "is-unread"}" data-action="open-email" data-id="${e.id}">
        <span class="mail-dot"></span>
        <span style="flex:1;min-width:0">
          <span class="list-title" style="display:block">${escapeHtml(e.subject)}</span>
          <span class="list-sub">Pedal Stack · ${dateTime(e.date)}</span>
        </span>
      </button>`).join("");
    return `<section class="page">
      ${pageTop()}
      <header class="panel-header"><h1>E-mails</h1><p>Confirmações enviadas para ${escapeHtml(state.account.email)}.</p></header>
      <div class="card">${emails.length ? items : `<p class="empty">Nenhum e-mail por enquanto.</p>`}</div>
    </section>`;
  },

  email() {
    const mail = state.account.emails.find(e => e.id === state.openEmailId);
    if (!mail) { state.screen = "inbox"; return screens.inbox(); }
    const rows = mail.rows.map(([k, v]) => `<tr><td>${escapeHtml(k)}</td><td>${escapeHtml(v)}</td></tr>`).join("");
    return `<section class="page">
      ${backLink("inbox")}
      <div class="card">
        <p class="eyebrow">De: Pedal Stack &lt;nao-responda@pedalstack.com.br&gt;</p>
        <h2>${escapeHtml(mail.subject)}</h2>
        <p class="muted">Para ${escapeHtml(state.account.email)} · ${dateTime(mail.date)}</p>
        <div class="mail-body">
          <p>Olá, ${escapeHtml(state.account.fullName.split(/\s+/)[0])}!</p>
          <p>${escapeHtml(mail.intro)}</p>
          <table>${rows}</table>
          ${mail.extra ? `<p>${escapeHtml(mail.extra)}</p>` : ""}
          <p class="muted">Boas pedaladas,<br>Equipe Pedal Stack</p>
        </div>
      </div>
    </section>`;
  },

  profile() {
    const account = state.account || {};
    const document = account.nationality === "estrangeiro"
      ? `Passaporte ${escapeHtml(account.passport || "")} · ${escapeHtml(account.issuingCountry || "")}`
      : `CPF ${escapeHtml(account.cpf || "")}`;
    return `<section class="page">
      ${pageTop()}
      <header class="panel-header"><h1>Meu perfil</h1><p>Seus dados, sempre à mão.</p></header>
      <div class="profile-card">
        ${state.successMessage ? `<p class="profile-success" role="status">${escapeHtml(state.successMessage)}</p>` : ""}
        <dl class="profile-details">
          <div class="profile-row"><dt>Nome</dt><dd>${escapeHtml(account.fullName || "")}</dd></div>
          <div class="profile-row"><dt>E-mail</dt><dd>${escapeHtml(account.email || "")}</dd></div>
          <div class="profile-row"><dt>Documento</dt><dd>${document}</dd></div>
          <div class="profile-row"><dt>Cartão</dt><dd>•••• •••• •••• ${escapeHtml(account.cardLast4 || "—")}</dd></div>
        </dl>
        <div class="profile-actions">
          <button class="btn btn-primary" data-screen="edit-profile">Editar dados</button>
          <button class="btn btn-secondary" data-screen="edit-card">Alterar cartão</button>
        </div>
      </div>
      <div class="demo-box">
        <p class="demo-title">Modo demonstração</p>
        <div class="demo-actions"><button type="button" data-action="reset-demo">Limpar aluguéis, cobranças e e-mails</button></div>
      </div>
    </section>`;
  },

  "edit-profile"() {
    state.nationality = state.account?.nationality || "brasileiro";
    return `<section class="panel panel-wide">
      ${backLink("profile")}
      <header class="panel-header"><h1>Editar dados</h1><p>Atualize suas informações pessoais.</p></header>
      <form id="edit-profile-form" novalidate>
        ${personalFields({ editing: true })}
        <p class="form-status" role="alert">${escapeHtml(state.statusMessage)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Salvar</button>
          <button class="btn-link" type="button" data-screen="profile">Cancelar</button>
        </div>
      </form>
    </section>`;
  },

  "edit-card"() {
    return `<section class="panel">
      ${backLink("profile")}
      <header class="panel-header"><h1>Alterar cartão</h1><p>Seus dados de pagamento ficam protegidos. O novo cartão é validado na hora.</p></header>
      <form id="edit-card-form" novalidate>
        ${cardFields()}
        <p class="form-status" role="alert">${escapeHtml(state.statusMessage)}</p>
        <div class="form-actions">
          <button class="btn btn-primary" type="submit">Salvar</button>
          <button class="btn-link" type="button" data-screen="profile">Cancelar</button>
        </div>
      </form>
    </section>`;
  }
};

const PUBLIC_SCREENS = ["welcome", "register", "success", "login"];

function render() {
  modalRoot.innerHTML = "";
  if (!PUBLIC_SCREENS.includes(state.screen) && !state.account) state.screen = "login";
  const view = screens[state.screen] || screens.welcome;
  app.innerHTML = view();
  renderTabbar();
  window.scrollTo(0, 0);
  if (state.screen === "trip") updateTrip();
}

function lockHint(totemId) {
  const totem = totemById(totemId);
  if (!totem) return "";
  const withBike = Object.entries(totem.trancas).filter(([, bike]) => bike).map(([n]) => n);
  return withBike.length ? `Trancas com bicicleta neste totem: ${withBike.join(", ")}` : "Nenhuma bicicleta disponível neste totem.";
}

/* =====================================================================
   Validações (Sprint 1)
   ===================================================================== */
function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
}

function showFieldError(name, message) {
  const fieldNode = app.querySelector(`[data-field="${name}"]`);
  if (!fieldNode) return;
  fieldNode.classList.add("has-error");
  const error = fieldNode.querySelector(".field-error");
  if (error) {
    error.querySelector("span").textContent = message;
    error.hidden = false;
  }
}

function clearErrors(form) {
  form.querySelectorAll(".has-error").forEach(node => node.classList.remove("has-error"));
  form.querySelectorAll(".field-error").forEach(node => {
    node.hidden = true;
    node.querySelector("span").textContent = "";
  });
  const status = form.querySelector(".form-status");
  if (status) status.textContent = "";
}

function setFormStatus(form, message) {
  const status = form.querySelector(".form-status");
  if (status) status.innerHTML = `${icons.error}<span>${escapeHtml(message)}</span>`;
}

function validateRequired(form, names) {
  let valid = true;
  for (const name of names) {
    const input = form.elements.namedItem(name);
    if (input && !input.value.trim()) {
      showFieldError(name, MESSAGES["06"]);
      valid = false;
    }
  }
  return valid;
}

function validEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

function formatCpf(value) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  return digits.replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d)/, "$1.$2").replace(/(\d{3})(\d{1,2})$/, "$1-$2");
}

function validCpf(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length !== 11 || /^(\d)\1{10}$/.test(digits)) return false;
  const calculate = length => {
    let sum = 0;
    for (let i = 0; i < length; i++) sum += Number(digits[i]) * (length + 1 - i);
    const remainder = (sum * 10) % 11;
    return remainder === 10 ? 0 : remainder;
  };
  return calculate(9) === Number(digits[9]) && calculate(10) === Number(digits[10]);
}

function validCardNumber(value) {
  const digits = value.replace(/\D/g, "");
  if (digits.length < 13 || digits.length > 19) return false;
  let sum = 0;
  let doubleDigit = false;
  for (let i = digits.length - 1; i >= 0; i--) {
    let digit = Number(digits[i]);
    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    doubleDigit = !doubleDigit;
  }
  return sum % 10 === 0;
}

function validExpiry(value) {
  const match = /^(0[1-9]|1[0-2])\/(\d{2})$/.exec(value);
  if (!match) return false;
  const month = Number(match[1]);
  const year = 2000 + Number(match[2]);
  const now = new Date();
  return year > now.getFullYear() || (year === now.getFullYear() && month >= now.getMonth() + 1);
}

function validateCard(form) {
  let valid = true;
  const number = form.elements.cardNumber.value;
  const holder = form.elements.cardholder.value.trim();
  const expiry = form.elements.expiry.value.trim();
  const cvv = form.elements.cvv.value.trim();
  if (!validCardNumber(number)) { showFieldError("cardNumber", MESSAGES["04"]); valid = false; }
  if (!holder) { showFieldError("cardholder", MESSAGES["06"]); valid = false; }
  if (!validExpiry(expiry)) { showFieldError("expiry", MESSAGES["04"]); valid = false; }
  if (!/^\d{3,4}$/.test(cvv)) { showFieldError("cvv", MESSAGES["04"]); valid = false; }
  return valid;
}

async function hashPassword(password) {
  if (!globalThis.crypto?.subtle) throw new Error("Web Crypto indisponível neste contexto.");
  const encoded = new TextEncoder().encode(password);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("");
}

function validatePersonal(form, { signup = false } = {}) {
  let valid = validateRequired(form, ["fullName", "email"]);
  const email = form.elements.email.value.trim();
  if (email && !validEmail(email)) { showFieldError("email", MESSAGES["02"]); valid = false; }
  if (state.nationality === "brasileiro") {
    const cpf = form.elements.cpf?.value.trim();
    if (!cpf) { showFieldError("cpf", MESSAGES["06"]); valid = false; }
    else if (!validCpf(cpf)) { showFieldError("cpf", MESSAGES["09"]); valid = false; }
  } else {
    valid = validateRequired(form, ["passport", "issuingCountry"]) && valid;
  }
  if (signup) {
    const password = form.elements.password.value;
    const confirmation = form.elements.confirmPassword.value;
    if (password.length < 8) { showFieldError("password", MESSAGES["03"]); valid = false; }
    if (confirmation !== password || !confirmation) { showFieldError("confirmPassword", confirmation ? MESSAGES["08"] : MESSAGES["06"]); valid = false; }
    if (!state.documentImage) { showFieldError("documentFile", MESSAGES["05"]); valid = false; }
  }
  return valid;
}

/* =====================================================================
   Sprint 1 – cadastro, login e perfil
   ===================================================================== */
async function submitRegister(form) {
  clearErrors(form);
  const personalValid = validatePersonal(form, { signup: true });
  const cardValid = validateCard(form);
  if (!personalValid || !cardValid) return;
  const email = form.elements.email.value.trim().toLowerCase();
  if (db.accounts[email]) {
    showFieldError("email", "Este e-mail já possui cadastro.");
    return;
  }
  try {
    const data = new FormData(form);
    const nationality = data.get("nationality");
    const account = {
      ...newAccountData(),
      fullName: data.get("fullName").trim(),
      email,
      nationality,
      cardLast4: data.get("cardNumber").replace(/\D/g, "").slice(-4),
      passwordHash: await hashPassword(data.get("password"))
    };
    if (nationality === "estrangeiro") {
      account.passport = data.get("passport").trim();
      account.issuingCountry = data.get("issuingCountry").trim();
    } else {
      account.cpf = formatCpf(data.get("cpf"));
    }
    db.accounts[email] = account;
    if (persist()) {
      state.documentImage = "";
      state.screen = "success";
      render();
    } else {
      setFormStatus(form, state.statusMessage);
    }
  } catch (error) {
    console.error("Não foi possível concluir o cadastro.", error);
    setFormStatus(form, "Não foi possível proteger sua senha neste navegador. Tente novamente em um navegador atualizado.");
  }
}

async function submitLogin(form) {
  clearErrors(form);
  const email = form.elements.loginEmail.value.trim().toLowerCase();
  const password = form.elements.loginPassword.value;
  let valid = true;
  if (!email) { showFieldError("loginEmail", MESSAGES["06"]); valid = false; }
  else if (!validEmail(email)) { showFieldError("loginEmail", MESSAGES["02"]); valid = false; }
  if (!password) { showFieldError("loginPassword", MESSAGES["06"]); valid = false; }
  if (!valid) return;

  const account = db.accounts[email];
  if (account && account.lockedUntil > Date.now()) {
    const seconds = Math.ceil((account.lockedUntil - Date.now()) / 1000);
    setFormStatus(form, MESSAGES["11"].replace("{s}", seconds));
    return;
  }
  try {
    const passwordHash = await hashPassword(password);
    if (!account || account.passwordHash !== passwordHash) {
      if (account) {
        account.loginAttempts = (account.loginAttempts || 0) + 1;
        if (account.loginAttempts >= MAX_TENTATIVAS_LOGIN) {
          account.loginAttempts = 0;
          account.lockedUntil = Date.now() + BLOQUEIO_SEGUNDOS * 1000;
          persist();
          setFormStatus(form, MESSAGES["11"].replace("{s}", BLOQUEIO_SEGUNDOS));
          return;
        }
        persist();
        const left = MAX_TENTATIVAS_LOGIN - account.loginAttempts;
        setFormStatus(form, `${MESSAGES["10"]} ${left === 1 ? "Resta 1 tentativa" : `Restam ${left} tentativas`} antes do bloqueio.`);
        return;
      }
      setFormStatus(form, MESSAGES["10"]);
      return;
    }
    account.loginAttempts = 0;
    account.lockedUntil = 0;
    db.session = email;
    state.account = account;
    persist();
    state.statusMessage = "";
    state.screen = activeRental() ? "trip" : "home";
    render();
  } catch (error) {
    console.error("Não foi possível verificar a senha.", error);
    setFormStatus(form, "Não foi possível verificar sua senha neste navegador. Tente novamente.");
  }
}

async function demoLogin() {
  const email = "ana.souza@pedalstack.com.br";
  if (!db.accounts[email]) {
    db.accounts[email] = {
      ...newAccountData(),
      fullName: "Ana Souza", email, nationality: "brasileiro", cpf: "529.982.247-25",
      cardLast4: "4242", passwordHash: await hashPassword("pedal1234")
    };
  }
  db.session = email;
  state.account = db.accounts[email];
  persist();
  state.screen = activeRental() ? "trip" : "home";
  render();
}

function submitEditProfile(form) {
  clearErrors(form);
  if (!validatePersonal(form)) return;
  const previousEmail = state.account.email;
  const newEmail = form.elements.email.value.trim().toLowerCase();
  if (newEmail !== previousEmail && db.accounts[newEmail]) {
    showFieldError("email", "Este e-mail já possui cadastro.");
    return;
  }
  const updated = { ...state.account, fullName: form.elements.fullName.value.trim(), email: newEmail };
  if (saveAccount(updated, previousEmail)) {
    state.successMessage = "Dados atualizados com sucesso.";
    state.screen = "profile";
    render();
  } else {
    setFormStatus(form, state.statusMessage);
  }
}

function submitEditCard(form) {
  clearErrors(form);
  if (!validateCard(form)) return;
  const updated = { ...state.account, cardLast4: form.elements.cardNumber.value.replace(/\D/g, "").slice(-4) };
  if (saveAccount(updated, updated.email)) {
    state.successMessage = "Cartão validado e atualizado com sucesso.";
    state.screen = "profile";
    render();
  } else {
    setFormStatus(form, state.statusMessage);
  }
}

/* =====================================================================
   Simulação de processamento (pagamento / tranca)
   ===================================================================== */
const wait = ms => new Promise(resolve => setTimeout(resolve, ms));

async function processingModal(title, steps, opId) {
  const draw = active => {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation">
      <section class="modal center" role="dialog" aria-modal="true" aria-label="${escapeHtml(title)}">
        <div class="spinner"></div>
        <h2>${escapeHtml(title)}</h2>
        <ul class="steps">${steps.map((s, i) => `<li class="${i < active ? "is-done" : i === active ? "is-active" : ""}">${i < active ? icons.check : icons.dot}${escapeHtml(s)}</li>`).join("")}</ul>
        ${opId ? `<p class="op-id">Operação ${escapeHtml(opId)}</p>` : ""}
      </section>
    </div>`;
  };
  for (let i = 0; i <= steps.length; i++) {
    draw(i);
    await wait(i === steps.length ? 250 : 650);
  }
  modalRoot.innerHTML = "";
}

function confirmModal({ title, text, confirm, cancel = "Voltar" }) {
  return new Promise(resolve => {
    modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation">
      <section class="modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
        <h2 id="confirm-title">${escapeHtml(title)}</h2>
        <p>${text}</p>
        <div class="modal-actions">
          <button class="btn btn-secondary" type="button" data-answer="no">${escapeHtml(cancel)}</button>
          <button class="btn btn-primary" type="button" data-answer="yes">${escapeHtml(confirm)}</button>
        </div>
      </section>
    </div>`;
    const handler = event => {
      const answer = event.target.closest("[data-answer]")?.dataset.answer;
      if (!answer && !event.target.classList.contains("modal-backdrop")) return;
      modalRoot.removeEventListener("click", handler);
      modalRoot.innerHTML = "";
      resolve(answer === "yes");
    };
    modalRoot.addEventListener("click", handler);
    modalRoot.querySelector("[data-answer='yes']").focus();
  });
}

/* =====================================================================
   Sprint 2 – alugar e devolver (US 04 e US 05)
   ===================================================================== */
async function submitRent(form) {
  clearErrors(form);
  if (state.processing) return;
  if (pendingCharges().length) { setFormStatus(form, MESSAGES["14"]); return; }
  const totem = totemById(new FormData(form).get("totem"));
  const lock = form.elements.lockNumber.value.trim();
  if (!lock) { showFieldError("lockNumber", MESSAGES["06"]); return; }
  if (!(lock in totem.trancas)) { showFieldError("lockNumber", MESSAGES["12"]); return; }
  const bike = totem.trancas[lock];
  if (!bike) { showFieldError("lockNumber", MESSAGES["13"]); return; }
  const simulateFail = form.elements.simulateLockFail.checked;

  const ok = await confirmModal({
    title: "Confirmar aluguel",
    text: `Bicicleta <b>${escapeHtml(bike)}</b> na tranca <b>${lock}</b> (${escapeHtml(totem.nome)}).<br>Taxa básica de <b>${money(TAXA_BASICA)}</b> por até 2 horas, cobrada <b>uma única vez</b> no cartão final ${escapeHtml(state.account.cardLast4)}.<br>Após 2 horas: ${money(TAXA_EXTRA)} a cada 30 minutos.`,
    confirm: "Confirmar e liberar"
  });
  if (!ok) return;

  state.processing = true;
  const opId = uid("OP");  // identificador único: evita cobrança duplicada
  const rentalId = uid("AL");
  try {
    await processingModal("Liberando sua bicicleta", ["Cobrando taxa básica", "Enviando comando à tranca", simulateFail ? "Tranca sem resposta – estornando" : "Tranca liberada"], opId);
    const now = Date.now();
    const charge = { id: uid("CB"), opId, rentalId, type: "basica", description: `Taxa básica – aluguel ${bike}`, value: TAXA_BASICA, status: "paga", attempts: 1, createdAt: now };
    state.account.charges.push(charge);
    state.lastRentalId = rentalId;
    if (simulateFail) {
      charge.status = "estornada";
      charge.description = `Taxa básica estornada – tranca ${lock} não liberou`;
      state.account.rentals.push({ id: rentalId, bike, totemOut: totem.id, lockOut: lock, start: now, status: "cancelado" });
      sendEmail("Estorno realizado – a tranca não liberou", "A tranca não liberou a bicicleta, então estornamos automaticamente a taxa cobrada.", [
        ["Totem", totem.nome], ["Tranca", lock], ["Data e hora", dateTime(now)], ["Valor estornado", money(TAXA_BASICA)], ["Operação", opId]
      ]);
      persist();
      state.screen = "rent-failed";
    } else {
      totem.trancas[lock] = null;
      state.account.rentals.push({ id: rentalId, bike, totemOut: totem.id, lockOut: lock, start: now, offsetMs: 0, notified: false, status: "ativo" });
      sendEmail("Aluguel confirmado – boa pedalada!", "Seu aluguel foi iniciado com sucesso.", [
        ["Bicicleta", bike], ["Totem", totem.nome], ["Tranca", lock], ["Início", dateTime(now)], ["Taxa básica (até 2h)", money(TAXA_BASICA)], ["Operação", opId]
      ], `Lembrete: após 2 horas é cobrado ${money(TAXA_EXTRA)} a cada 30 minutos. Avisaremos você 15 minutos antes.`);
      persist();
      state.flash = { type: "ok", text: `Bicicleta ${bike} liberada! A tranca ${lock} está aberta.` };
      state.screen = "trip";
    }
    render();
  } catch (error) {
    console.error(error);
    setFormStatus(form, MESSAGES["16"]);
  } finally {
    state.processing = false;
  }
}

async function submitReturn(form) {
  clearErrors(form);
  if (state.processing) return;
  const rental = activeRental();
  if (!rental) return;
  const totem = totemById(new FormData(form).get("totem"));
  const lock = state.selectedLock;
  if (!lock || !(lock in totem.trancas) || totem.trancas[lock]) { setFormStatus(form, MESSAGES["15"]); return; }
  const decline = form.elements.simulateCardDecline.checked;

  state.processing = true;
  try {
    const minutes = elapsedMinutes(rental);
    const fee = extraFee(minutes);
    const steps = ["Bicicleta encaixada na tranca", "Registrando devolução"];
    if (fee) steps.push(decline ? "Cartão recusado – taxa pendente" : "Cobrando taxa extra");
    await processingModal("Confirmando devolução", steps);

    const now = Date.now();
    rental.end = now;
    rental.minutes = minutes;
    rental.totemIn = totem.id;
    rental.lockIn = lock;
    rental.status = "concluido";
    totem.trancas[lock] = rental.bike;
    let extra = null;
    if (fee) {
      extra = { id: uid("CB"), opId: uid("OP"), rentalId: rental.id, type: "extra", description: `Taxa extra – ${formatDuration(minutes)} de uso (${rental.bike})`, value: fee, status: decline ? "pendente" : "paga", attempts: 1, createdAt: now };
      state.account.charges.push(extra);
    }
    sendEmail("Devolução confirmada", "Sua bicicleta foi devolvida com sucesso. Confira o resumo da viagem:", [
      ["Bicicleta", rental.bike], ["Devolução", `${totem.nome} · tranca ${lock}`], ["Data e hora", dateTime(now)], ["Tempo de uso", formatDuration(minutes)],
      ["Taxa extra", extra ? `${money(extra.value)} (${extra.status})` : "Não houve"]
    ], extra?.status === "pendente" ? "Não conseguimos cobrar a taxa extra. Ela ficou pendente e será cobrada novamente; até lá, novos aluguéis ficam bloqueados. Você pode quitá-la pelo extrato do aplicativo." : "");
    persist();
    state.lastRentalId = rental.id;
    state.selectedLock = null;
    state.screen = "receipt";
    render();
  } catch (error) {
    console.error(error);
    setFormStatus(form, MESSAGES["16"]);
  } finally {
    state.processing = false;
  }
}

/* =====================================================================
   Sprint 3 – aviso de 1h45, pendências, e-mail e extrato (US 06–09)
   ===================================================================== */
function updateTrip() {
  const rental = activeRental();
  if (!rental || state.screen !== "trip") return;
  const minutes = elapsedMinutes(rental);
  const timer = document.querySelector("#trip-timer");
  const bar = document.querySelector("#trip-progress");
  const extra = document.querySelector("#trip-extra");
  if (timer) timer.textContent = formatDuration(minutes, true);
  if (bar) {
    bar.querySelector("span").style.width = `${Math.min(100, (minutes / LIMITE_MIN) * 100)}%`;
    bar.classList.toggle("is-over", minutes > LIMITE_MIN);
  }
  if (extra) {
    const fee = extraFee(minutes);
    extra.hidden = !fee;
    extra.textContent = fee ? `Você passou das 2 horas. Taxa extra até agora: ${money(fee)}.` : "";
  }
}

function checkWarning() {
  const rental = activeRental();
  if (!rental || rental.notified) return;
  const minutes = elapsedMinutes(rental);
  if (minutes >= AVISO_MIN) {
    rental.notified = true;
    persist();
    if (minutes >= LIMITE_MIN) return; // já passou das 2h: o aviso não faz mais sentido
    const limit = rental.start - (rental.offsetMs || 0) + LIMITE_MIN * 60000;
    showToast("Faltam 15 minutos!", `Seu aluguel completa 2 horas às ${timeOnly(limit)}. Devolva a bicicleta em uma tranca livre para evitar a taxa extra de ${money(TAXA_EXTRA)} a cada 30 min.`);
  }
}

function showToast(title, text) {
  toastRoot.innerHTML = `<div class="toast" role="alert">${icons.bell}<div style="flex:1"><strong>${escapeHtml(title)}</strong><p>${escapeHtml(text)}</p></div><button type="button" aria-label="Fechar" data-action="close-toast">×</button></div>`;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toastRoot.innerHTML = ""; }, 9000);
}

async function retryCharge(id) {
  if (state.processing) return;
  const charge = state.account.charges.find(c => c.id === id);
  if (!charge || charge.status !== "pendente") return; // cobranças já pagas não são reprocessadas
  const fail = document.querySelector("#simulate-retry-fail")?.checked;
  state.processing = true;
  try {
    await processingModal("Cobrando taxa pendente", ["Localizando cartão final " + state.account.cardLast4, fail ? "Cartão recusado novamente" : "Pagamento aprovado"], charge.opId);
    charge.attempts = (charge.attempts || 1) + 1;
    charge.updatedAt = Date.now();
    if (fail) {
      state.flash = { type: "error", text: "O cartão foi recusado novamente. A taxa continua pendente; atualize seu cartão no perfil ou tente mais tarde." };
    } else {
      charge.status = "paga";
      sendEmail("Taxa extra quitada", "Recebemos o pagamento da taxa extra que estava pendente. Seus aluguéis estão liberados novamente.", [
        ["Descrição", charge.description], ["Valor", money(charge.value)], ["Data do pagamento", dateTime(charge.updatedAt)], ["Tentativas", String(charge.attempts)]
      ]);
      state.flash = { type: "ok", text: `Pagamento de ${money(charge.value)} aprovado. Aluguéis liberados!` };
    }
    persist();
    render();
  } finally {
    state.processing = false;
  }
}

setInterval(() => {
  if (!state.account) return;
  updateTrip();
  checkWarning();
}, 1000);

/* =====================================================================
   Modais e eventos
   ===================================================================== */
function showCancelModal() {
  modalRoot.innerHTML = `<div class="modal-backdrop" role="presentation">
    <section class="modal" role="dialog" aria-modal="true" aria-labelledby="cancel-title">
      <h2 id="cancel-title">Cancelar cadastro?</h2>
      <p>${MESSAGES["07"]}</p>
      <div class="modal-actions">
        <button class="btn btn-secondary" type="button" data-action="continue-register">Continuar cadastro</button>
        <button class="btn btn-primary" type="button" data-action="confirm-cancel">Sim, cancelar</button>
      </div>
    </section>
  </div>`;
  modalRoot.querySelector("button").focus();
}

function formatCardInput(input) {
  const digits = input.value.replace(/\D/g, "").slice(0, 19);
  input.value = digits.replace(/(\d{4})(?=\d)/g, "$1 ");
}

function handleNavigation(target, event) {
  event.preventDefault();
  const next = target.dataset.screen;
  if (next === "register" && state.screen === "welcome") state.documentImage = "";
  if (next !== "profile") state.successMessage = "";
  if (next === "return") { state.selectedTotem = activeRental()?.totemOut || "T01"; state.selectedLock = null; }
  state.screen = next;
  state.statusMessage = "";
  render();
}

document.addEventListener("click", event => {
  if (event.target.closest("#modal-root")) return;
  const target = event.target.closest("[data-screen], [data-action], [data-reveal]");
  if (!target) return;
  if (target.dataset.screen) { handleNavigation(target, event); return; }
  const action = target.dataset.action;
  if (action === "cancel-register") showCancelModal();
  else if (action === "logout") {
    db.session = null;
    persist();
    state.account = null;
    state.screen = "welcome";
    toastRoot.innerHTML = "";
    render();
  }
  else if (action === "demo-login") demoLogin();
  else if (action === "close-toast") toastRoot.innerHTML = "";
  else if (action === "advance" || action === "jump") {
    const rental = activeRental();
    if (!rental) return;
    const minutes = Number(target.dataset.minutes);
    if (action === "advance") rental.offsetMs = (rental.offsetMs || 0) + minutes * 60000;
    else rental.offsetMs = minutes * 60000 - (Date.now() - rental.start);
    if (elapsedMinutes(rental) < AVISO_MIN) rental.notified = false;
    persist();
    updateTrip();
    checkWarning();
  }
  else if (action === "select-lock") {
    state.selectedLock = target.dataset.lock;
    app.querySelectorAll(".lock").forEach(node => node.classList.toggle("is-selected", node === target));
    const status = app.querySelector(".form-status");
    if (status) status.textContent = "";
  }
  else if (action === "retry-charge") retryCharge(target.dataset.id);
  else if (action === "open-email") {
    const mail = state.account.emails.find(e => e.id === target.dataset.id);
    if (mail) { mail.read = true; persist(); }
    state.openEmailId = target.dataset.id;
    state.screen = "email";
    render();
  }
  else if (action === "reset-demo") {
    confirmModal({ title: "Limpar dados da demonstração?", text: "Aluguéis, cobranças e e-mails desta conta serão apagados e os totens voltarão ao estado inicial.", confirm: "Limpar" }).then(ok => {
      if (!ok) return;
      Object.assign(state.account, { rentals: [], charges: [], emails: [] });
      db.totens = freshTotens();
      persist();
      state.successMessage = "Dados da demonstração limpos.";
      render();
    });
  }
  else if (target.dataset.reveal) {
    const input = app.querySelector(`#${target.dataset.reveal}`);
    const isVisible = input.type === "text";
    input.type = isVisible ? "password" : "text";
    target.textContent = isVisible ? "Mostrar" : "Ocultar";
    target.setAttribute("aria-label", isVisible ? "Mostrar senha" : "Ocultar senha");
  }
});

modalRoot.addEventListener("click", event => {
  const action = event.target.closest("[data-action]")?.dataset.action;
  if (action === "continue-register") modalRoot.innerHTML = "";
  if (action === "confirm-cancel") {
    modalRoot.innerHTML = "";
    state.documentImage = "";
    state.screen = "welcome";
    render();
  }
  if (event.target.classList.contains("modal-backdrop") && !modalRoot.querySelector(".spinner")) modalRoot.innerHTML = "";
});

app.addEventListener("change", event => {
  const target = event.target;
  if (target.name === "totem") {
    state.selectedTotem = target.value;
    if (state.screen === "return") { state.selectedLock = null; render(); return; }
    const hint = app.querySelector('[data-field="lockNumber"] .field-hint');
    if (hint) hint.textContent = lockHint(target.value);
  }
  if (target.name === "nationality") {
    const form = target.closest("form");
    const current = new FormData(form);
    state.nationality = target.value;
    const identityFields = app.querySelector("#identity-fields");
    if (identityFields) identityFields.innerHTML = documentFields(state.screen === "edit-profile");
    const existing = app.querySelector("#identity-fields");
    if (existing) {
      if (state.nationality === "estrangeiro") {
        const passport = existing.querySelector('[name="passport"]');
        const country = existing.querySelector('[name="issuingCountry"]');
        if (passport && current.get("passport")) passport.value = current.get("passport");
        if (country && current.get("issuingCountry")) country.value = current.get("issuingCountry");
      } else {
        const cpf = existing.querySelector('[name="cpf"]');
        if (cpf && current.get("cpf")) cpf.value = current.get("cpf");
      }
    }
  }
  if (target.name === "documentFile") {
    const file = target.files[0];
    if (!file) return;
    const acceptedType = ["image/jpeg", "image/png"].includes(file.type);
    if (!acceptedType || file.size > 5 * 1024 * 1024) {
      state.documentImage = "";
      const box = target.closest(".field");
      box.classList.add("has-error");
      const message = box.querySelector(".field-error");
      message.querySelector("span").textContent = MESSAGES["05"];
      message.hidden = false;
      target.value = "";
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      state.documentImage = String(reader.result);
      const preview = app.querySelector("#document-preview");
      preview.src = state.documentImage;
      preview.hidden = false;
      app.querySelector("#upload-copy").textContent = file.name;
      const box = target.closest(".field");
      box.classList.remove("has-error");
      box.querySelector(".field-error").hidden = true;
    });
    reader.addEventListener("error", () => {
      console.error("Falha ao ler a imagem do documento.");
      const box = target.closest(".field");
      box.classList.add("has-error");
      const message = box.querySelector(".field-error");
      message.querySelector("span").textContent = MESSAGES["05"];
      message.hidden = false;
    });
    reader.readAsDataURL(file);
  }
});

app.addEventListener("input", event => {
  const target = event.target;
  if (target.name === "cpf") target.value = formatCpf(target.value);
  if (target.name === "cardNumber") formatCardInput(target);
  if (target.name === "expiry") {
    const digits = target.value.replace(/\D/g, "").slice(0, 4);
    target.value = digits.length > 2 ? `${digits.slice(0, 2)}/${digits.slice(2)}` : digits;
  }
  if (target.name === "cvv") target.value = target.value.replace(/\D/g, "").slice(0, 4);
  if (target.name === "lockNumber") target.value = target.value.replace(/\D/g, "").slice(0, 4);
  const wrapper = target.closest(".field");
  if (wrapper?.classList.contains("has-error")) {
    wrapper.classList.remove("has-error");
    const message = wrapper.querySelector(".field-error");
    if (message) message.hidden = true;
  }
});

app.addEventListener("submit", event => {
  event.preventDefault();
  const form = event.target;
  if (form.id === "register-form") submitRegister(form);
  if (form.id === "login-form") submitLogin(form);
  if (form.id === "edit-profile-form") submitEditProfile(form);
  if (form.id === "edit-card-form") submitEditCard(form);
  if (form.id === "rent-form") submitRent(form);
  if (form.id === "return-form") submitReturn(form);
});

render();
