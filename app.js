/**
 * Painel Operacional - 3º Batalhão de Caçadores
 * Aplicação modular com foco em segurança, performance e UX.
 */
(function () {
    'use strict';

    // =========================================================
    // CONFIGURAÇÃO
    // =========================================================
    const CONFIG = Object.freeze({
        DEJEM_URL_BASE: 'https://sistemasadmin.intranet.policiamilitar.sp.gov.br/Escala/arrelpreesc.aspx?',
        DEJEM_ID_REGEX: /^\d{7}$/,
        STORAGE_KEYS: {
            HISTORY: 'pmesp3bc:dejem-history',
        },
        HISTORY_MAX: 10,
        CLOCK_INTERVAL_MS: 1000,
    });

    const TOOLS = Object.freeze([
        { id: 1, title: 'Intranet', url: 'http://www.intranet.policiamilitar.sp.gov.br/', img: 'PMESP.png', alt: 'Logo Intranet' },
        { id: 2, title: 'Plataforma EAD', url: 'https://ead.pmesp.org/login/index.php', img: 'EAD PMESP.png', alt: 'Logo EAD' },
        { id: 3, title: 'SIOPM Web', url: 'https://sistemasopr.intranet.policiamilitar.sp.gov.br/siopmweb/HSiopm.aspx', img: 'SIOPM Web.png', alt: 'Logo SIOPM' },
        { id: 4, title: 'COPOM Online', url: 'https://copomonline.policiamilitar.sp.gov.br/Login/Login', img: 'COPOM Online.png', alt: 'Logo COPOM' },
        { id: 5, title: 'Projeto V.I.D.A.', url: 'http://201.55.56.170/medidasrestritivas/sys/layout/default/', img: 'Projeto VIDA.png', alt: 'Logo Projeto VIDA' },
        { id: 6, title: 'SIM Multas', url: 'https://simprod.prodesp.sp.gov.br/sim/', img: 'DETRAN.png', alt: 'Logo SIM Multas' },
        { id: 7, title: 'Muralha Paulista', url: 'https://operacional.muralhapaulista.sp.gov.br/Home/Login/', img: 'Muralha Paulista.png', alt: 'Logo Muralha' },
        { id: 8, title: 'SEI', url: 'https://minhaarea.sp.gov.br/plataformasp', img: 'SEI.png', alt: 'Logo SEI' },
        { id: 9, title: 'Infocrim 4.0', url: 'https://www.infocrim.ssp.sp.gov.br/', img: 'SSP-SP.png', alt: 'Logo Infocrim' },
        { id: 10, title: 'WhatsApp Web', url: 'https://web.whatsapp.com/', img: 'WhatsApp.png', alt: 'Logo WhatsApp' },
        { id: 11, title: 'Portal RH - SGP', url: 'https://sgp-prod.intranet.policiamilitar.sp.gov.br/SGP/Dashboard', img: 'SGP.png', alt: 'Logo SGP' },
        { id: 12, title: 'SITAF', url: 'https://sistemasadmin.intranet.policiamilitar.sp.gov.br/Pmesp.Sitaf/#/login', img: 'SITAF.png', alt: 'Logo SITAF' },
        { id: 13, title: 'SIGS Saúde', url: 'https://sistemasadmin.intranet.policiamilitar.sp.gov.br/Pericias', img: 'DS.png', alt: 'Logo DS' },
        { id: 14, title: 'iNotes PMESP', url: 'https://correio.policiamilitar.sp.gov.br/iwaredir.nsf', img: 'iNotes.png', alt: 'Logo iNotes' },
        { id: 15, title: 'Assentamento Individual', url: 'http://www.intranet.ccb.policiamilitar.sp.gov.br/aplicacoes/sisbol_login/frmlogin_cpd/', img: 'DP.png', alt: 'Logo DP' },
        { id: 16, title: 'SICoorOp PM', url: 'http://sicoordop.intranet.policiamilitar.sp.gov.br/login/index.php', img: 'CoordOpPM.png', alt: 'Logo CoordOp' },
        { id: 17, title: 'Arquivo Digital P/3', url: 'http://10.40.68.79:8000/', img: 'PaperlessNGX.png', alt: 'Logo PaperlessNGX' },
    ]);

    const ALLOWED_HOSTS = Object.freeze([
        'intranet.policiamilitar.sp.gov.br',
        'policiamilitar.sp.gov.br',
        'ead.pmesp.org',
        'sistemasopr.intranet.policiamilitar.sp.gov.br',
        'copomonline.policiamilitar.sp.gov.br',
        '201.55.56.170',
        'simprod.prodesp.sp.gov.br',
        'operacional.muralhapaulista.sp.gov.br',
        'minhaarea.sp.gov.br',
        'infocrim.ssp.sp.gov.br',
        'web.whatsapp.com',
        'sgp-prod.intranet.policiamilitar.sp.gov.br',
        'sistemasadmin.intranet.policiamilitar.sp.gov.br',
        'correio.policiamilitar.sp.gov.br',
        'intranet.ccb.policiamilitar.sp.gov.br',
        'sicoordop.intranet.policiamilitar.sp.gov.br',
        '10.40.68.79',
    ]);

    // =========================================================
    // UTILITÁRIOS
    // =========================================================
    const $ = (selector, root) => (root || document).querySelector(selector);
    const $$ = (selector, root) => [...(root || document).querySelectorAll(selector)];

    function isSafeUrl(rawUrl) {
        try {
            const url = new URL(rawUrl);
            if (!['http:', 'https:'].includes(url.protocol)) return false;
            return ALLOWED_HOSTS.some(host =>
                url.hostname === host || url.hostname.endsWith('.' + host)
            );
        } catch {
            return false;
        }
    }

    function safeOpen(url) {
        if (!isSafeUrl(url)) {
            showToast('URL de destino não autorizada.', 'error');
            return false;
        }
        window.open(url, '_blank', 'noopener,noreferrer');
        return true;
    }

    const storage = {
        get(key, fallback) {
            try {
                const v = localStorage.getItem(key);
                return v === null ? fallback : JSON.parse(v);
            } catch { return fallback; }
        },
        set(key, value) {
            try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* noop */ }
        },
        remove(key) {
            try { localStorage.removeItem(key); } catch { /* noop */ }
        },
    };

    function showToast(message, type, duration) {
        type = type || 'info';
        duration = duration || 3000;
        const container = $('#toast-container');
        if (!container) return;
        const toast = document.createElement('div');
        toast.className = 'toast toast--' + type;
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        container.appendChild(toast);
        setTimeout(() => {
            toast.style.transition = 'opacity 0.3s, transform 0.3s';
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(120%)';
            setTimeout(() => toast.remove(), 320);
        }, duration);
    }

    function handleImageError(img) {
        img.addEventListener('error', function onErr() {
            img.removeEventListener('error', onErr);
            const label = (img.dataset.fallback || '?').slice(0, 6);
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 70 50">' +
                '<rect width="70" height="50" fill="#1c2028" rx="6"/>' +
                '<text x="35" y="30" text-anchor="middle" fill="#C5B358" ' +
                'font-family="monospace" font-size="11" font-weight="700">' + label + '</text>' +
                '</svg>';
            img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
        });
    }

    // =========================================================
    // RELÓGIO
    // =========================================================
    function initClock() {
        const clockEl = $('#live-clock');
        if (!clockEl) return;
        const dateEl = $('.live-clock__date', clockEl);
        const timeEl = $('.live-clock__time', clockEl);
        if (!dateEl || !timeEl) return;

        let lastTime = '';
        let lastDate = '';

        const update = () => {
            const now = new Date();
            const time = now.toLocaleTimeString('pt-BR');
            if (time === lastTime) return;
            lastTime = time;
            timeEl.textContent = time;

            const date = now.toLocaleDateString('pt-BR', {
                weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
            });
            if (date !== lastDate) {
                lastDate = date;
                dateEl.textContent = date;
            }
        };
        update();
        setInterval(update, CONFIG.CLOCK_INTERVAL_MS);
    }

    // =========================================================
    // STATUS DE CONEXÃO
    // =========================================================
    function initConnectionStatus() {
        const badge = $('#connection-status');
        if (!badge) return;
        const textEl = $('.status-badge__text', badge);
        if (!textEl) return;

        const update = () => {
            const online = navigator.onLine;
            badge.classList.toggle('status-badge--online', online);
            badge.classList.toggle('status-badge--offline', !online);
            textEl.textContent = online ? 'Online' : 'Offline';
            badge.title = online ? 'Conectado' : 'Sem conexão';
        };
        update();
        window.addEventListener('online', update);
        window.addEventListener('offline', update);
    }

    // =========================================================
    // RENDERIZAÇÃO DO GRID
    // =========================================================
    function renderTools() {
        const grid = $('#dashboard');
        if (!grid) return;

        const fragment = document.createDocumentFragment();

        TOOLS.forEach(tool => {
            if (!isSafeUrl(tool.url)) {
                console.warn('[Segurança] URL bloqueada para "' + tool.title + '": ' + tool.url);
                return;
            }
            const link = document.createElement('a');
            link.className = 'card';
            link.href = tool.url;
            link.target = '_blank';
            link.rel = 'noopener noreferrer';
            link.setAttribute('aria-label', 'Abrir ' + tool.title);

            const num = document.createElement('span');
            num.className = 'card-number';
            num.textContent = String(tool.id).padStart(2, '0');

            const img = document.createElement('img');
            img.className = 'card-logo';
            img.src = tool.img;
            img.alt = tool.alt;
            img.loading = 'lazy';
            img.width = 70;
            img.height = 50;
            img.dataset.fallback = tool.title;
            handleImageError(img);

            const title = document.createElement('span');
            title.className = 'card-title';
            title.textContent = tool.title;

            link.append(num, img, title);
            fragment.appendChild(link);
        });

        grid.appendChild(fragment);
    }

    // =========================================================
    // DEJEM
    // =========================================================
    function initDejem() {
        const form = $('#dejem-form');
        const input = $('#idEscalaInput');
        if (!form || !input) return;

        input.addEventListener('input', (e) => {
            e.target.value = e.target.value.replace(/\D/g, '').slice(0, 7);
            e.target.classList.remove('is-invalid');
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const value = input.value.trim();
            if (!CONFIG.DEJEM_ID_REGEX.test(value)) {
                input.classList.add('is-invalid');
                input.focus();
                showToast('ID inválido. Digite 7 dígitos.', 'error');
                setTimeout(() => input.classList.remove('is-invalid'), 2000);
                return;
            }
            const url = CONFIG.DEJEM_URL_BASE + encodeURIComponent(value);
            if (!safeOpen(url)) return;
            addToHistory(value);
            input.value = '';
        });
    }

    // =========================================================
    // HISTÓRICO DEJEM
    // =========================================================
    function getHistory() {
        const list = storage.get(CONFIG.STORAGE_KEYS.HISTORY, []);
        return Array.isArray(list) ? list : [];
    }

    function addToHistory(id) {
        const history = getHistory().filter(item => item && item.id !== id);
        history.unshift({ id: id, timestamp: Date.now() });
        storage.set(CONFIG.STORAGE_KEYS.HISTORY, history.slice(0, CONFIG.HISTORY_MAX));
    }

    function clearHistory() {
        storage.remove(CONFIG.STORAGE_KEYS.HISTORY);
        renderHistory();
        showToast('Histórico limpo.', 'success');
    }

    function formatTime(ts) {
        try {
            return new Date(ts).toLocaleString('pt-BR', {
                day: '2-digit', month: '2-digit',
                hour: '2-digit', minute: '2-digit',
            });
        } catch { return ''; }
    }

    function renderHistory() {
        const list = $('#history-list');
        const clearBtn = $('#history-clear');
        if (!list) return;
        list.innerHTML = '';

        const history = getHistory();
        if (clearBtn) clearBtn.disabled = history.length === 0;

        if (history.length === 0) {
            const empty = document.createElement('p');
            empty.className = 'history-empty';
            empty.textContent = 'Nenhuma escala acessada ainda.';
            list.appendChild(empty);
            return;
        }

        history.forEach(item => {
            const el = document.createElement('button');
            el.className = 'history-item';
            el.type = 'button';
            el.setAttribute('aria-label', 'Abrir escala ' + item.id);

            const idSpan = document.createElement('span');
            idSpan.className = 'history-item__id';
            idSpan.textContent = String(item.id);

            const timeSpan = document.createElement('span');
            timeSpan.className = 'history-item__time';
            timeSpan.textContent = formatTime(item.timestamp);

            el.append(idSpan, timeSpan);
            el.addEventListener('click', () => {
                const url = CONFIG.DEJEM_URL_BASE + encodeURIComponent(item.id);
                if (safeOpen(url)) closeModal();
            });
            list.appendChild(el);
        });
    }

    // =========================================================
    // MODAL (com focus trap)
    // =========================================================
    let lastFocusedElement = null;

    function getFocusable(container) {
        return $$(
            'a[href], button:not([disabled]), input:not([disabled]), ' +
            'select:not([disabled]), textarea:not([disabled]), ' +
            '[tabindex]:not([tabindex="-1"])',
            container
        ).filter(el => el.offsetParent !== null);
    }

    function openModal() {
        const modal = $('#history-modal');
        if (!modal) return;
        lastFocusedElement = document.activeElement;
        renderHistory();
        modal.hidden = false;
        document.body.style.overflow = 'hidden';
        const focusables = getFocusable(modal);
        if (focusables.length) focusables[0].focus();
    }

    function closeModal() {
        const modal = $('#history-modal');
        if (!modal) return;
        modal.hidden = true;
        document.body.style.overflow = '';
        if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
            lastFocusedElement.focus();
        }
        lastFocusedElement = null;
    }

    function initHistory() {
        const btn = $('#history-button');
        const clearBtn = $('#history-clear');
        const modal = $('#history-modal');

        if (btn) btn.addEventListener('click', openModal);
        if (clearBtn) clearBtn.addEventListener('click', clearHistory);
        if (!modal) return;

        $$('[data-close-modal]', modal).forEach(el =>
            el.addEventListener('click', closeModal)
        );

        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                e.preventDefault();
                closeModal();
                return;
            }
            if (e.key === 'Tab') {
                const focusables = getFocusable(modal);
                if (!focusables.length) return;
                const first = focusables[0];
                const last = focusables[focusables.length - 1];
                if (e.shiftKey && document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        });
    }

    // =========================================================
    // SERVICE WORKER
    // =========================================================
    function initServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (location.protocol === 'file:') return;

        window.addEventListener('load', () => {
            navigator.serviceWorker.register('sw.js').catch(() => { /* silent */ });
        });
    }

    // =========================================================
    // BOOTSTRAP
    // =========================================================
    function init() {
        initConnectionStatus();
        initClock();
        renderTools();
        initDejem();
        initHistory();
        initServiceWorker();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();