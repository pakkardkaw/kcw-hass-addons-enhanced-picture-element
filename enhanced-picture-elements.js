// Enhanced Picture Elements Card for Home Assistant
// A HACS Lovelace custom card with visual entity positioning,
// icon color controls, and ambient light circle effects.
// Version: 1.0.3

(function () {
  'use strict';

  const VERSION = '1.0.3';
  const CARD_NAME = 'enhanced-picture-elements';
  const EDITOR_NAME = 'enhanced-picture-elements-editor';

  // ============================================================
  // UTILITIES
  // ============================================================

  function esc(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function isOn(state) {
    if (!state) return false;
    return ['on', 'home', 'open', 'unlocked', 'playing', 'active'].includes(
      String(state.state).toLowerCase()
    );
  }

  function hexToRgb(hex) {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}` : null;
  }

  function miredToRgb(mired) {
    const k = Math.round(1000000 / mired) / 100;
    let r, g, b;
    if (k <= 66) {
      r = 255;
      g = Math.max(0, Math.min(255, 99.47 * Math.log(k) - 161.12));
      b = k <= 19 ? 0 : Math.max(0, Math.min(255, 138.52 * Math.log(k - 10) - 305.04));
    } else {
      r = Math.max(0, Math.min(255, 329.7 * Math.pow(k - 60, -0.1332)));
      g = Math.max(0, Math.min(255, 288.12 * Math.pow(k - 60, -0.0755)));
      b = 255;
    }
    return `${Math.round(r)},${Math.round(g)},${Math.round(b)}`;
  }

  function resolveAmbienceRgb(hass, entityId, customColor) {
    if (customColor && customColor !== 'auto') {
      return hexToRgb(customColor) || '255,200,100';
    }
    const s = hass?.states[entityId];
    if (!s) return '255,200,100';
    const a = s.attributes;
    if (a.rgb_color) return a.rgb_color.join(',');
    if (a.color_temp) return miredToRgb(a.color_temp);
    // warm white default
    return '255,200,100';
  }

  function fmtState(state) {
    if (!state) return '';
    const v = state.state;
    const u = state.attributes?.unit_of_measurement || '';
    if (v === 'unavailable' || v === 'unknown') return '';
    if (v === 'on') return 'On';
    if (v === 'off') return 'Off';
    return u ? `${v} ${u}` : v;
  }

  function defaultElement() {
    return {
      entity: '',
      label: '',
      icon: '',
      icon_size: 30,
      color_on: '#FFD700',
      color_off: '#888888',
      show_state: false,
      show_label: true,
      tap_action: 'toggle',
      ambience: false,
      ambience_radius: 55,
      ambience_opacity: 0.55,
      ambience_color: 'auto',
      position: { x: 50, y: 50 },
    };
  }

  function clamp(v, lo, hi) {
    return Math.max(lo, Math.min(hi, v));
  }

  const DOMAIN_ICONS = {
    light: 'mdi:lightbulb', switch: 'mdi:toggle-switch',
    sensor: 'mdi:eye', binary_sensor: 'mdi:checkbox-marked-circle',
    climate: 'mdi:thermostat', cover: 'mdi:window-shutter',
    fan: 'mdi:fan', media_player: 'mdi:cast', camera: 'mdi:camera',
    lock: 'mdi:lock', alarm_control_panel: 'mdi:shield-home',
    automation: 'mdi:robot', script: 'mdi:script-text',
    scene: 'mdi:palette', input_boolean: 'mdi:toggle-switch',
    input_number: 'mdi:ray-vertex', input_select: 'mdi:format-list-bulleted',
    input_text: 'mdi:form-textbox', person: 'mdi:account',
    device_tracker: 'mdi:cellphone', weather: 'mdi:weather-cloudy',
    vacuum: 'mdi:robot-vacuum', number: 'mdi:ray-vertex',
    select: 'mdi:format-list-bulleted', button: 'mdi:gesture-tap-button',
    timer: 'mdi:timer', counter: 'mdi:counter', sun: 'mdi:white-balance-sunny',
    update: 'mdi:package-up', humidifier: 'mdi:air-humidifier',
    water_heater: 'mdi:water-boiler', zone: 'mdi:map-marker-radius',
  };

  function getEntityIcon(hass, entityId) {
    if (!entityId) return 'mdi:help-circle';
    const state = hass?.states[entityId];
    if (state?.attributes?.icon) return state.attributes.icon;
    const domain = entityId.split('.')[0];
    return DOMAIN_ICONS[domain] || 'mdi:help-circle';
  }

  // ============================================================
  // CARD CSS
  // ============================================================

  const CARD_CSS = `
    :host { display: block; }
    ha-card { overflow: hidden; position: relative; padding: 0; }
    .container {
      position: relative;
      width: 100%;
      overflow: hidden;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
    }
    .bg-image {
      width: 100%;
      height: auto;
      display: block;
      -webkit-user-drag: none;
      user-drag: none;
      pointer-events: none;
    }
    .bg-placeholder {
      width: 100%;
      height: 200px;
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.3);
      font-size: 0.85em;
    }
    .layer {
      position: absolute;
      inset: 0;
      width: 100%;
      height: 100%;
    }
    /* ---- Ambience circles ---- */
    .amb {
      position: absolute;
      border-radius: 50%;
      transform: translate(-50%, -50%);
      pointer-events: none;
      transition:
        opacity 0.9s cubic-bezier(0.4,0,0.2,1),
        background 0.9s cubic-bezier(0.4,0,0.2,1),
        box-shadow 0.9s cubic-bezier(0.4,0,0.2,1);
    }
    .amb.on { animation: amb-pulse 3.5s ease-in-out infinite; }
    .amb.off { opacity: 0 !important; box-shadow: none !important; background: transparent !important; }
    @keyframes amb-pulse {
      0%,100% { transform: translate(-50%,-50%) scale(1.00); opacity: 1; }
      50%      { transform: translate(-50%,-50%) scale(1.14); opacity: 0.7; }
    }
    /* ---- Entity icons ---- */
    .elem {
      position: absolute;
      transform: translate(-50%, -50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 3px;
      cursor: pointer;
      z-index: 10;
      -webkit-tap-highlight-color: transparent;
      transition: filter 0.2s ease, transform 0.15s ease;
    }
    .elem:hover { filter: brightness(1.25) drop-shadow(0 0 6px rgba(255,255,255,0.4)); }
    .elem:active { transform: translate(-50%,-50%) scale(0.92); }
    .elem.unavail { opacity: 0.35; pointer-events: none; }

    /* Edit-mode outline */
    .elem.editable { cursor: grab; }
    .elem.editable:active { cursor: grabbing; }
    .elem.editable::after {
      content: '';
      position: absolute;
      inset: -10px;
      border: 1.5px dashed rgba(var(--rgb-primary-color,33,150,243),0.7);
      border-radius: 8px;
      pointer-events: none;
      animation: dash-anim 8s linear infinite;
    }
    @keyframes dash-anim {
      to { stroke-dashoffset: -100; }
    }
    .elem.editable.selected::after {
      border-color: var(--primary-color);
      border-style: solid;
      box-shadow: 0 0 0 2px rgba(var(--rgb-primary-color,33,150,243),0.3);
    }

    ha-icon.eicon {
      display: block;
      filter: drop-shadow(0 1px 4px rgba(0,0,0,0.6));
      transition: color 0.4s ease;
    }
    .estate {
      font-size: 0.72em;
      font-weight: 600;
      color: #fff;
      background: rgba(0,0,0,0.55);
      border-radius: 10px;
      padding: 1px 7px;
      white-space: nowrap;
      backdrop-filter: blur(4px);
      -webkit-backdrop-filter: blur(4px);
      line-height: 1.5;
      pointer-events: none;
    }
    .elabel {
      font-size: 0.63em;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 4px rgba(0,0,0,0.9);
      white-space: nowrap;
      letter-spacing: 0.03em;
      pointer-events: none;
    }
    /* Card title */
    .card-title {
      position: absolute;
      top: 10px;
      left: 12px;
      font-size: 0.85em;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 5px rgba(0,0,0,0.8);
      z-index: 5;
      pointer-events: none;
      letter-spacing: 0.04em;
    }
    /* Edit toolbar */
    .edit-bar {
      position: absolute;
      bottom: 10px;
      right: 10px;
      z-index: 20;
      display: flex;
      gap: 6px;
    }
    .edt-btn {
      display: flex;
      align-items: center;
      gap: 5px;
      padding: 6px 14px;
      border: none;
      border-radius: 20px;
      font-size: 0.78em;
      font-weight: 700;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 2px 10px rgba(0,0,0,0.35);
      transition: filter 0.15s;
      letter-spacing: 0.03em;
    }
    .edt-btn:hover { filter: brightness(1.12); }
    .edt-btn.primary { background: var(--primary-color); color: #fff; }
    .edt-btn.ghost   { background: rgba(0,0,0,0.55); color: #fff; }
  `;

  // ============================================================
  // EDITOR CSS
  // ============================================================

  const EDITOR_CSS = `
    * { box-sizing: border-box; }
    :host { display: block; }
    .root {
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 18px;
    }
    /* ---- Section heading ---- */
    .sh {
      font-size: 0.78em;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.1em;
      color: var(--primary-text-color);
      padding-bottom: 5px;
      border-bottom: 2px solid var(--primary-color);
      margin-bottom: 10px;
    }
    /* ---- Preview canvas ---- */
    .preview-wrap {
      position: relative;
      width: 100%;
      border-radius: 10px;
      overflow: hidden;
      background: #1a1a2e;
      box-shadow: 0 3px 12px rgba(0,0,0,0.25);
      min-height: 100px;
      touch-action: none;
      user-select: none;
    }
    .preview-wrap img {
      width: 100%;
      height: auto;
      display: block;
      pointer-events: none;
      -webkit-user-drag: none;
    }
    .preview-placeholder {
      height: 120px;
      display: flex;
      align-items: center;
      justify-content: center;
      color: rgba(255,255,255,0.35);
      font-size: 0.82em;
    }
    .preview-tip {
      font-size: 0.72em;
      color: var(--secondary-text-color);
      font-style: italic;
      margin-top: 4px;
      text-align: center;
    }
    /* Preview elements */
    .pv-amb {
      position: absolute;
      border-radius: 50%;
      transform: translate(-50%,-50%);
      pointer-events: none;
      transition: opacity 0.6s, background 0.6s, box-shadow 0.6s;
    }
    .pv-amb.on { animation: amb-pulse 3.5s ease-in-out infinite; }
    .pv-amb.off { opacity: 0 !important; }
    .pv-elem {
      position: absolute;
      transform: translate(-50%,-50%);
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2px;
      cursor: grab;
      z-index: 10;
      touch-action: none;
    }
    .pv-elem:active { cursor: grabbing; }
    .pv-elem.selected::after {
      content: '';
      position: absolute;
      inset: -10px;
      border: 2px solid var(--primary-color);
      border-radius: 8px;
      pointer-events: none;
      box-shadow: 0 0 0 3px rgba(var(--rgb-primary-color,33,150,243),0.2);
    }
    .pv-icon {
      filter: drop-shadow(0 1px 4px rgba(0,0,0,0.7));
    }
    .pv-label {
      font-size: 0.58em;
      font-weight: 700;
      color: #fff;
      text-shadow: 0 1px 3px rgba(0,0,0,0.9);
      white-space: nowrap;
      pointer-events: none;
    }
    /* ---- Form elements ---- */
    .frow { display: flex; flex-direction: column; gap: 4px; margin-bottom: 10px; }
    .frow label { font-size: 0.78em; color: var(--secondary-text-color); font-weight: 600; }
    .frow input[type=text],
    .frow input[type=number],
    .frow select {
      width: 100%;
      padding: 8px 10px;
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: 6px;
      background: var(--card-background-color, #fff);
      color: var(--primary-text-color);
      font-size: 0.88em;
    }
    .frow input[type=range] {
      flex: 1;
      accent-color: var(--primary-color);
    }
    .range-row { display: flex; align-items: center; gap: 8px; }
    .range-val {
      min-width: 38px;
      text-align: right;
      font-size: 0.78em;
      color: var(--secondary-text-color);
      font-weight: 600;
    }
    .frow input[type=color] {
      width: 44px;
      height: 32px;
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: 6px;
      padding: 2px 3px;
      background: none;
      cursor: pointer;
    }
    .color-row { display: flex; align-items: center; gap: 10px; }
    .color-label { font-size: 0.78em; color: var(--secondary-text-color); }
    .check-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 8px;
    }
    .check-row input[type=checkbox] {
      accent-color: var(--primary-color);
      width: 15px;
      height: 15px;
      cursor: pointer;
    }
    .check-row label {
      font-size: 0.84em;
      color: var(--primary-text-color);
      cursor: pointer;
    }
    .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
    /* ---- Entity list ---- */
    .elist { display: flex; flex-direction: column; gap: 6px; }
    .eitem {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px 11px;
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: 8px;
      cursor: pointer;
      background: var(--secondary-background-color, rgba(0,0,0,0.04));
      transition: background 0.15s, border-color 0.15s;
    }
    .eitem:hover { background: rgba(var(--rgb-primary-color,33,150,243),0.07); }
    .eitem.sel {
      border-color: var(--primary-color);
      background: rgba(var(--rgb-primary-color,33,150,243),0.1);
    }
    .eitem-meta { flex: 1; min-width: 0; }
    .eitem-name {
      font-size: 0.84em;
      font-weight: 600;
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .eitem-id {
      font-size: 0.72em;
      color: var(--secondary-text-color);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .del-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--error-color, #f44336);
      padding: 4px 6px;
      border-radius: 6px;
      display: flex;
      align-items: center;
      transition: background 0.15s;
    }
    .del-btn:hover { background: rgba(244,67,54,0.1); }
    .add-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      width: 100%;
      padding: 10px;
      border: 1.5px dashed var(--primary-color);
      border-radius: 8px;
      background: none;
      color: var(--primary-color);
      font-size: 0.84em;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.15s;
      letter-spacing: 0.02em;
    }
    .add-btn:hover { background: rgba(var(--rgb-primary-color,33,150,243),0.08); }
    /* ---- Property panel ---- */
    .ppanel {
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-radius: 10px;
      padding: 14px;
      background: var(--secondary-background-color, rgba(0,0,0,0.03));
    }
    .ppanel-title {
      font-size: 0.78em;
      font-weight: 800;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      margin-bottom: 14px;
    }
    hr.div { border: none; border-top: 1px solid var(--divider-color, rgba(0,0,0,0.1)); margin: 12px 0; }
    .amb-box {
      border: 1px solid var(--divider-color, rgba(0,0,0,0.12));
      border-left: 3px solid var(--primary-color);
      border-radius: 0 8px 8px 0;
      padding: 10px 12px;
      margin-top: 8px;
      background: rgba(var(--rgb-primary-color,33,150,243),0.04);
    }
    .amb-box-title {
      font-size: 0.75em;
      font-weight: 700;
      color: var(--primary-color);
      text-transform: uppercase;
      letter-spacing: 0.06em;
      margin-bottom: 10px;
    }
    ha-entity-picker { display: block; width: 100%; }
    ha-icon-picker { display: block; width: 100%; }
  `;

  // ============================================================
  // MAIN CARD
  // ============================================================

  class EnhancedPictureElementsCard extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = null;
      this._hass = null;
      this._editMode = false;
    }

    static getConfigElement() {
      return document.createElement(EDITOR_NAME);
    }

    static getStubConfig() {
      return {
        image: '',
        title: '',
        elements: [],
      };
    }

    setConfig(config) {
      if (!config) throw new Error('Missing configuration');
      this._config = {
        image: '',
        title: '',
        elements: [],
        ...config,
        elements: (config.elements || []).map(el => ({ ...defaultElement(), ...el })),
      };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._patchStates();
    }

    get hass() { return this._hass; }

    set editMode(v) {
      if (this._editMode === v) return;
      this._editMode = v;
      this._render();
    }

    get editMode() { return this._editMode; }

    _render() {
      if (!this._config) return;
      const cfg = this._config;

      this.shadowRoot.innerHTML = `
        <style>${CARD_CSS}</style>
        <ha-card>
          <div class="container" id="container">
            ${cfg.image
              ? `<img class="bg-image" src="${esc(cfg.image)}" alt="" />`
              : `<div class="bg-placeholder">Set background image in card config</div>`}
            ${cfg.title ? `<div class="card-title">${esc(cfg.title)}</div>` : ''}
            <div class="layer" id="layer">
              ${this._renderAmb()}
              ${this._renderElems()}
            </div>
            ${this._editMode ? `
              <div class="edit-bar">
                <button class="edt-btn ghost" id="btn-add">
                  <ha-icon icon="mdi:plus-circle-outline" style="--mdc-icon-size:16px"></ha-icon>
                  Add Entity
                </button>
              </div>` : ''}
          </div>
        </ha-card>`;

      this._bind();
    }

    _renderAmb() {
      return (this._config.elements || []).map((el, i) => {
        if (!el.ambience) return '';
        const state = this._hass?.states[el.entity];
        const on = isOn(state);
        const r = el.ambience_radius || 55;
        const op = el.ambience_opacity || 0.55;
        const rgb = this._hass ? resolveAmbienceRgb(this._hass, el.entity, el.ambience_color) : '255,200,100';
        const onStyle = on
          ? `background:radial-gradient(circle,rgba(${rgb},${op}) 0%,rgba(${rgb},${op * 0.35}) 45%,transparent 72%);box-shadow:0 0 ${Math.round(r * 0.65)}px ${Math.round(r * 0.25)}px rgba(${rgb},${op * 0.45});`
          : '';
        return `<div class="amb ${on ? 'on' : 'off'}" data-i="${i}" style="left:${el.position?.x ?? 50}%;top:${el.position?.y ?? 50}%;width:${r * 2}px;height:${r * 2}px;${onStyle}"></div>`;
      }).join('');
    }

    _renderElems() {
      return (this._config.elements || []).map((el, i) => {
        const state = this._hass?.states[el.entity];
        const on = isOn(state);
        const unavail = state?.state === 'unavailable';
        let color = el.color || '';
        if (el.color_on && on) color = el.color_on;
        if (el.color_off && !on) color = el.color_off;
        const sz = el.icon_size || 30;
        const editCls = this._editMode ? 'editable' : '';
        const icon = el.icon || getEntityIcon(this._hass, el.entity);
        return `
          <div class="elem ${editCls} ${unavail ? 'unavail' : ''}" data-i="${i}"
            style="left:${el.position?.x ?? 50}%;top:${el.position?.y ?? 50}%;">
            <ha-icon class="eicon" icon="${esc(icon)}"
              style="--mdc-icon-size:${sz}px;color:${color || 'rgba(255,255,255,0.92)'};"></ha-icon>
            ${el.show_state && state ? `<div class="estate">${esc(fmtState(state))}</div>` : ''}
            ${el.show_label && el.label ? `<div class="elabel">${esc(el.label)}</div>` : ''}
          </div>`;
      }).join('');
    }

    _patchStates() {
      if (!this.shadowRoot || !this._config || !this._hass) return;
      const elems = this._config.elements || [];
      this.shadowRoot.querySelectorAll('.amb').forEach(node => {
        const i = parseInt(node.dataset.i, 10);
        const el = elems[i];
        if (!el) return;
        const state = this._hass.states[el.entity];
        const on = isOn(state);
        const r = el.ambience_radius || 55;
        const op = el.ambience_opacity || 0.55;
        const rgb = resolveAmbienceRgb(this._hass, el.entity, el.ambience_color);
        node.className = `amb ${on ? 'on' : 'off'}`;
        if (on) {
          node.style.background = `radial-gradient(circle,rgba(${rgb},${op}) 0%,rgba(${rgb},${op * 0.35}) 45%,transparent 72%)`;
          node.style.boxShadow = `0 0 ${Math.round(r * 0.65)}px ${Math.round(r * 0.25)}px rgba(${rgb},${op * 0.45})`;
        } else {
          node.style.background = '';
          node.style.boxShadow = '';
        }
      });
      this.shadowRoot.querySelectorAll('.elem').forEach(node => {
        const i = parseInt(node.dataset.i, 10);
        const el = elems[i];
        if (!el) return;
        const state = this._hass.states[el.entity];
        const on = isOn(state);
        const unavail = state?.state === 'unavailable';
        let color = el.color || '';
        if (el.color_on && on) color = el.color_on;
        if (el.color_off && !on) color = el.color_off;
        node.classList.toggle('unavail', unavail);
        const icon = node.querySelector('.eicon');
        if (icon) icon.style.color = color || 'rgba(255,255,255,0.92)';
        const est = node.querySelector('.estate');
        if (est) est.textContent = fmtState(state);
      });
    }

    _bind() {
      const shadow = this.shadowRoot;
      if (!shadow) return;
      shadow.querySelectorAll('.elem').forEach(node => {
        const i = parseInt(node.dataset.i, 10);
        if (this._editMode) {
          this._makeDraggable(node, i);
        } else {
          node.addEventListener('click', () => this._tap(i));
        }
      });
      shadow.querySelector('#btn-add')?.addEventListener('click', () => {
        this._fire('enhanced-picture-elements-add');
      });
    }

    _makeDraggable(node, i) {
      let origin = null;
      const start = (cx, cy) => {
        origin = { cx, cy, moved: false };
        node.style.transition = 'none';
        const amb = this.shadowRoot.querySelector(`.amb[data-i="${i}"]`);
        if (amb) amb.style.transition = 'none';
      };
      const move = (cx, cy) => {
        if (!origin) return;
        if (Math.hypot(cx - origin.cx, cy - origin.cy) > 3) origin.moved = true;
        if (!origin.moved) return;
        const layer = this.shadowRoot.querySelector('#layer');
        if (!layer) return;
        const rect = layer.getBoundingClientRect();
        const x = clamp(((cx - rect.left) / rect.width) * 100, 0, 100);
        const y = clamp(((cy - rect.top) / rect.height) * 100, 0, 100);
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
        const amb = this.shadowRoot.querySelector(`.amb[data-i="${i}"]`);
        if (amb) { amb.style.left = `${x}%`; amb.style.top = `${y}%`; }
      };
      const end = (cx, cy) => {
        if (!origin) return;
        if (origin.moved) {
          const layer = this.shadowRoot.querySelector('#layer');
          if (layer) {
            const rect = layer.getBoundingClientRect();
            const x = Math.round(clamp(((cx - rect.left) / rect.width) * 100, 0, 100) * 10) / 10;
            const y = Math.round(clamp(((cy - rect.top) / rect.height) * 100, 0, 100) * 10) / 10;
            this._fire('enhanced-picture-elements-move', { i, x, y });
          }
        } else {
          this._fire('enhanced-picture-elements-select', { i });
        }
        origin = null;
        node.style.transition = '';
      };
      node.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        node.setPointerCapture(e.pointerId);
        start(e.clientX, e.clientY);
      });
      node.addEventListener('pointermove', e => move(e.clientX, e.clientY));
      node.addEventListener('pointerup', e => end(e.clientX, e.clientY));
      node.addEventListener('pointercancel', () => { origin = null; node.style.transition = ''; });
    }

    _tap(i) {
      const el = this._config.elements[i];
      if (!el?.entity || !this._hass) return;
      const action = el.tap_action || 'toggle';
      const [domain] = el.entity.split('.');
      if (action === 'toggle' || action === 'turn_on' || action === 'turn_off') {
        this._hass.callService(domain, action, { entity_id: el.entity });
      } else if (action === 'more-info') {
        this._fire('hass-more-info', { entityId: el.entity });
      } else if (action === 'navigate' && el.navigate_to) {
        history.pushState(null, '', el.navigate_to);
        window.dispatchEvent(new PopStateEvent('popstate'));
      }
    }

    _fire(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { detail, bubbles: true, composed: true }));
    }
  }

  customElements.define(CARD_NAME, EnhancedPictureElementsCard);

  // ============================================================
  // EDITOR
  // ============================================================

  class EnhancedPictureElementsEditor extends HTMLElement {
    constructor() {
      super();
      this.attachShadow({ mode: 'open' });
      this._config = null;
      this._hass = null;
      this._sel = null;
    }

    setConfig(config) {
      this._config = {
        image: '',
        title: '',
        elements: [],
        ...config,
        elements: (config.elements || []).map(el => ({ ...defaultElement(), ...el })),
      };
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      const pickers = this.shadowRoot?.querySelectorAll('ha-entity-picker, ha-icon-picker');
      pickers?.forEach(p => { p.hass = hass; });
    }

    _render() {
      if (!this._config) return;

      this.shadowRoot.innerHTML = `
        <style>${EDITOR_CSS}
          @keyframes amb-pulse {
            0%,100% { transform:translate(-50%,-50%) scale(1); opacity:1; }
            50%      { transform:translate(-50%,-50%) scale(1.14); opacity:0.7; }
          }
        </style>
        <div class="root">

          <div>
            <div class="sh">Card Settings</div>
            <div class="frow">
              <label>Background Image URL</label>
              <input type="text" id="inp-img" value="${esc(this._config.image || '')}" placeholder="/local/floorplan.png" />
            </div>
            <div class="frow">
              <label>Card Title (optional)</label>
              <input type="text" id="inp-title" value="${esc(this._config.title || '')}" placeholder="My Home" />
            </div>
          </div>

          <div>
            <div class="sh">Visual Preview &amp; Positioning</div>
            <div class="preview-wrap" id="preview">
              ${this._config.image
                ? `<img src="${esc(this._config.image)}" alt="" />`
                : `<div class="preview-placeholder">Set an image URL above to see the preview</div>`}
              ${this._renderPvAmb()}
              ${this._renderPvElems()}
            </div>
            <div class="preview-tip">Drag icons to reposition • Click an icon to select it</div>
          </div>

          <div>
            <div class="sh">Entities</div>
            <div class="elist" id="elist">${this._renderElist()}</div>
            <button class="add-btn" id="btn-add">
              <ha-icon icon="mdi:plus" style="--mdc-icon-size:18px"></ha-icon>
              Add Entity
            </button>
          </div>

          ${this._sel !== null ? this._renderPropPanel() : ''}
        </div>`;

      this._bindEditor();
    }

    _renderPvAmb() {
      return (this._config.elements || []).map((el, i) => {
        if (!el.ambience) return '';
        const state = this._hass?.states[el.entity];
        const on = isOn(state);
        const r = el.ambience_radius || 55;
        const op = el.ambience_opacity || 0.55;
        const rgb = this._hass ? resolveAmbienceRgb(this._hass, el.entity, el.ambience_color) : '255,200,100';
        const onStyle = on
          ? `background:radial-gradient(circle,rgba(${rgb},${op}) 0%,rgba(${rgb},${op * 0.35}) 45%,transparent 72%);box-shadow:0 0 ${Math.round(r * 0.65)}px ${Math.round(r * 0.25)}px rgba(${rgb},${op * 0.45});`
          : '';
        return `<div class="pv-amb ${on ? 'on' : 'off'}" data-pi="${i}"
          style="left:${el.position?.x ?? 50}%;top:${el.position?.y ?? 50}%;width:${r * 2}px;height:${r * 2}px;${onStyle}"></div>`;
      }).join('');
    }

    _renderPvElems() {
      return (this._config.elements || []).map((el, i) => {
        const state = this._hass?.states[el.entity];
        const on = isOn(state);
        let color = el.color || '';
        if (el.color_on && on) color = el.color_on;
        if (el.color_off && !on) color = el.color_off;
        const sz = Math.max(20, (el.icon_size || 30) * 0.75);
        const selCls = this._sel === i ? 'selected' : '';
        const icon = el.icon || getEntityIcon(this._hass, el.entity);
        return `
          <div class="pv-elem ${selCls}" data-pi="${i}"
            style="left:${el.position?.x ?? 50}%;top:${el.position?.y ?? 50}%;">
            <ha-icon class="pv-icon" icon="${esc(icon)}"
              style="--mdc-icon-size:${sz}px;color:${color || 'rgba(255,255,255,0.92)'};filter:drop-shadow(0 1px 4px rgba(0,0,0,0.7));">
            </ha-icon>
            ${el.show_label && el.label ? `<div class="pv-label">${esc(el.label)}</div>` : ''}
          </div>`;
      }).join('');
    }

    _renderElist() {
      return (this._config.elements || []).map((el, i) => {
        const icon = el.icon || getEntityIcon(this._hass, el.entity);
        return `
        <div class="eitem ${this._sel === i ? 'sel' : ''}" data-li="${i}">
          <ha-icon icon="${esc(icon)}" style="--mdc-icon-size:20px;flex-shrink:0;"></ha-icon>
          <div class="eitem-meta">
            <div class="eitem-name">${esc(el.label || el.entity || 'Unnamed')}</div>
            <div class="eitem-id">${esc(el.entity || 'No entity set')}</div>
          </div>
          <button class="del-btn" data-del="${i}" title="Remove">
            <ha-icon icon="mdi:trash-can-outline" style="--mdc-icon-size:17px"></ha-icon>
          </button>
        </div>`;
      }).join('');
    }

    _renderPropPanel() {
      const el = this._config.elements[this._sel];
      if (!el) return '';
      const autoAmb = !el.ambience_color || el.ambience_color === 'auto';
      const ambColorVal = autoAmb ? '#ffcc66' : (el.ambience_color || '#ffcc66');
      const effectiveIcon = el.icon || getEntityIcon(this._hass, el.entity);

      return `
        <div class="ppanel">
          <div class="ppanel-title">Configure Entity</div>

          <div class="frow">
            <label>Entity</label>
            <ha-entity-picker id="pp-entity" value="${esc(el.entity || '')}" allow-custom-entity></ha-entity-picker>
          </div>

          <div class="frow">
            <label>Display Label</label>
            <input type="text" id="pp-label" value="${esc(el.label || '')}" placeholder="e.g. Living Room" />
          </div>

          <div class="frow">
            <label>Icon</label>
            <ha-icon-picker id="pp-icon" value="${esc(effectiveIcon)}"></ha-icon-picker>
          </div>

          <div class="two-col">
            <div class="frow">
              <label>X Position (%)</label>
              <div class="range-row">
                <input type="range" id="pp-x" min="0" max="100" step="0.5" value="${el.position?.x ?? 50}" />
                <span class="range-val" id="rv-x">${Math.round((el.position?.x ?? 50) * 10) / 10}%</span>
              </div>
            </div>
            <div class="frow">
              <label>Y Position (%)</label>
              <div class="range-row">
                <input type="range" id="pp-y" min="0" max="100" step="0.5" value="${el.position?.y ?? 50}" />
                <span class="range-val" id="rv-y">${Math.round((el.position?.y ?? 50) * 10) / 10}%</span>
              </div>
            </div>
          </div>

          <div class="frow">
            <label>Icon Size (px)</label>
            <div class="range-row">
              <input type="range" id="pp-sz" min="16" max="80" step="2" value="${el.icon_size || 30}" />
              <span class="range-val" id="rv-sz">${el.icon_size || 30}px</span>
            </div>
          </div>

          <div class="two-col">
            <div class="frow">
              <label>Color when ON</label>
              <div class="color-row">
                <input type="color" id="pp-con" value="${esc(el.color_on || '#FFD700')}" />
                <span class="color-label">Active state</span>
              </div>
            </div>
            <div class="frow">
              <label>Color when OFF</label>
              <div class="color-row">
                <input type="color" id="pp-coff" value="${esc(el.color_off || '#888888')}" />
                <span class="color-label">Inactive state</span>
              </div>
            </div>
          </div>

          <div class="check-row">
            <input type="checkbox" id="pp-showstate" ${el.show_state ? 'checked' : ''} />
            <label for="pp-showstate">Show state value under icon</label>
          </div>
          <div class="check-row">
            <input type="checkbox" id="pp-showlabel" ${el.show_label ? 'checked' : ''} />
            <label for="pp-showlabel">Show label under icon</label>
          </div>

          <div class="frow">
            <label>Tap Action</label>
            <select id="pp-tap">
              <option value="toggle"   ${(el.tap_action||'toggle')==='toggle'   ?'selected':''}>Toggle</option>
              <option value="turn_on"  ${el.tap_action==='turn_on'              ?'selected':''}>Turn On</option>
              <option value="turn_off" ${el.tap_action==='turn_off'             ?'selected':''}>Turn Off</option>
              <option value="more-info"${el.tap_action==='more-info'            ?'selected':''}>More Info popup</option>
              <option value="none"     ${el.tap_action==='none'                 ?'selected':''}>None</option>
            </select>
          </div>

          <hr class="div" />

          <div class="check-row">
            <input type="checkbox" id="pp-amb" ${el.ambience ? 'checked' : ''} />
            <label for="pp-amb"><strong>Ambience Light Circle</strong> &mdash; glowing halo around this entity</label>
          </div>

          ${el.ambience ? `
            <div class="amb-box">
              <div class="amb-box-title">Ambience Settings</div>
              <div class="frow">
                <label>Glow Color</label>
                <div class="color-row">
                  <input type="color" id="pp-ambcol" value="${esc(ambColorVal)}" ${autoAmb ? 'disabled' : ''} />
                  <div>
                    <div class="check-row" style="margin:0;">
                      <input type="checkbox" id="pp-ambcol-auto" ${autoAmb ? 'checked' : ''} />
                      <label for="pp-ambcol-auto">Auto (use entity RGB/color-temp)</label>
                    </div>
                  </div>
                </div>
              </div>
              <div class="frow">
                <label>Glow Radius (px)</label>
                <div class="range-row">
                  <input type="range" id="pp-ambr" min="20" max="160" step="5" value="${el.ambience_radius || 55}" />
                  <span class="range-val" id="rv-ambr">${el.ambience_radius || 55}px</span>
                </div>
              </div>
              <div class="frow">
                <label>Glow Opacity</label>
                <div class="range-row">
                  <input type="range" id="pp-ambo" min="0.05" max="1" step="0.05" value="${el.ambience_opacity || 0.55}" />
                  <span class="range-val" id="rv-ambo">${el.ambience_opacity || 0.55}</span>
                </div>
              </div>
            </div>` : ''}
        </div>`;
    }

    _bindEditor() {
      const s = this.shadowRoot;
      if (!s) return;

      s.querySelector('#inp-img')?.addEventListener('change', e => {
        this._config.image = e.target.value.trim();
        this._emit();
        this._render();
      });
      s.querySelector('#inp-title')?.addEventListener('change', e => {
        this._config.title = e.target.value;
        this._emit();
      });

      s.querySelectorAll('.eitem[data-li]').forEach(node => {
        node.addEventListener('click', e => {
          if (e.target.closest('.del-btn')) return;
          const i = parseInt(node.dataset.li, 10);
          this._sel = this._sel === i ? null : i;
          this._render();
        });
      });

      s.querySelectorAll('.del-btn[data-del]').forEach(btn => {
        btn.addEventListener('click', e => {
          e.stopPropagation();
          const i = parseInt(btn.dataset.del, 10);
          this._config.elements.splice(i, 1);
          if (this._sel === i) this._sel = null;
          else if (this._sel > i) this._sel--;
          this._emit();
          this._render();
        });
      });

      s.querySelector('#btn-add')?.addEventListener('click', () => {
        this._config.elements.push(defaultElement());
        this._sel = this._config.elements.length - 1;
        this._emit();
        this._render();
      });

      s.querySelectorAll('.pv-elem[data-pi]').forEach(node => {
        this._bindPreviewDrag(node, parseInt(node.dataset.pi, 10));
      });

      if (this._sel !== null) {
        this._bindPropPanel(s);
      }
    }

    _bindPreviewDrag(node, i) {
      let orig = null;
      node.addEventListener('pointerdown', e => {
        if (e.button > 0) return;
        e.preventDefault();
        node.setPointerCapture(e.pointerId);
        orig = { cx: e.clientX, cy: e.clientY, moved: false };
      });
      node.addEventListener('pointermove', e => {
        if (!orig) return;
        if (Math.hypot(e.clientX - orig.cx, e.clientY - orig.cy) > 4) orig.moved = true;
        if (!orig.moved) return;
        const preview = this.shadowRoot.querySelector('#preview');
        if (!preview) return;
        const rect = preview.getBoundingClientRect();
        const x = clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100);
        const y = clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100);
        node.style.left = `${x}%`;
        node.style.top = `${y}%`;
        const amb = this.shadowRoot.querySelector(`.pv-amb[data-pi="${i}"]`);
        if (amb) { amb.style.left = `${x}%`; amb.style.top = `${y}%`; }
      });
      node.addEventListener('pointerup', e => {
        if (!orig) return;
        if (orig.moved) {
          const preview = this.shadowRoot.querySelector('#preview');
          if (preview) {
            const rect = preview.getBoundingClientRect();
            const x = Math.round(clamp(((e.clientX - rect.left) / rect.width) * 100, 0, 100) * 10) / 10;
            const y = Math.round(clamp(((e.clientY - rect.top) / rect.height) * 100, 0, 100) * 10) / 10;
            this._config.elements[i].position = { x, y };
            this._emit();
            if (this._sel === i) {
              const xEl = this.shadowRoot.querySelector('#pp-x');
              const yEl = this.shadowRoot.querySelector('#pp-y');
              const rxEl = this.shadowRoot.querySelector('#rv-x');
              const ryEl = this.shadowRoot.querySelector('#rv-y');
              if (xEl) xEl.value = x;
              if (yEl) yEl.value = y;
              if (rxEl) rxEl.textContent = `${x}%`;
              if (ryEl) ryEl.textContent = `${y}%`;
            }
          }
        } else {
          this._sel = this._sel === i ? null : i;
          this._render();
        }
        orig = null;
      });
      node.addEventListener('pointercancel', () => { orig = null; });
    }

    _bindPropPanel(s) {
      const i = this._sel;
      const el = this._config.elements[i];
      if (!el) return;

      const set = (key, val, sub) => {
        if (sub) { el[sub] = { ...el[sub], [key]: val }; }
        else { el[key] = val; }
        this._emit();
      };
      const setRender = (key, val, sub) => { set(key, val, sub); this._render(); };

      // Entity picker — auto-fills icon and label from entity state
      const ep = s.querySelector('#pp-entity');
      if (ep) {
        if (this._hass) ep.hass = this._hass;
        ep.addEventListener('value-changed', e => {
          const entityId = e.detail.value;
          el.entity = entityId;
          el.icon = '';
          if (!el.label) {
            const state = this._hass?.states[entityId];
            if (state?.attributes?.friendly_name) {
              el.label = state.attributes.friendly_name;
              const labelInp = s.querySelector('#pp-label');
              if (labelInp) labelInp.value = el.label;
            }
          }
          // Update preview and entity list icons in-place
          const resolvedIcon = getEntityIcon(this._hass, entityId);
          const pvIcon = this.shadowRoot.querySelector(`.pv-elem[data-pi="${i}"] .pv-icon`);
          if (pvIcon) pvIcon.setAttribute('icon', resolvedIcon);
          const listIcon = this.shadowRoot.querySelector(`.eitem[data-li="${i}"] ha-icon`);
          if (listIcon) listIcon.setAttribute('icon', resolvedIcon);
          const iconPickerEl = s.querySelector('#pp-icon');
          if (iconPickerEl) iconPickerEl.value = resolvedIcon;
          this._emit();
        });
      }

      s.querySelector('#pp-label')?.addEventListener('change', e => set('label', e.target.value));

      // Icon picker — update preview in-place (no full re-render to avoid destroying entity picker)
      const iconPicker = s.querySelector('#pp-icon');
      if (iconPicker) {
        if (this._hass) iconPicker.hass = this._hass;
        const initialIconValue = iconPicker.value;
        iconPicker.addEventListener('value-changed', e => {
          const newIcon = e.detail.value;
          if (newIcon === initialIconValue && !el.icon) return; // skip init fire
          const storedIcon = newIcon === getEntityIcon(this._hass, el.entity) ? '' : newIcon;
          set('icon', storedIcon);
          const pvIcon = this.shadowRoot.querySelector(`.pv-elem[data-pi="${i}"] .pv-icon`);
          if (pvIcon) pvIcon.setAttribute('icon', newIcon);
          const listIcon = this.shadowRoot.querySelector(`.eitem[data-li="${i}"] ha-icon`);
          if (listIcon) listIcon.setAttribute('icon', newIcon);
        });
      }

      const ranges = [
        ['#pp-x',    '#rv-x',    v => `${v}%`,  k => set('x', parseFloat(k), 'position')],
        ['#pp-y',    '#rv-y',    v => `${v}%`,  k => set('y', parseFloat(k), 'position')],
        ['#pp-sz',   '#rv-sz',   v => `${v}px`, k => set('icon_size', parseFloat(k))],
        ['#pp-ambr', '#rv-ambr', v => `${v}px`, k => set('ambience_radius', parseFloat(k))],
        ['#pp-ambo', '#rv-ambo', v => `${v}`,   k => set('ambience_opacity', parseFloat(k))],
      ];
      ranges.forEach(([id, rid, fmt, handler]) => {
        const inp = s.querySelector(id);
        if (!inp) return;
        inp.addEventListener('input', e => {
          const v = e.target.value;
          const rv = s.querySelector(rid);
          if (rv) rv.textContent = fmt(v);
          handler(v);
          if (id === '#pp-x' || id === '#pp-y') {
            const coord = id === '#pp-x' ? 'left' : 'top';
            const pvNode = this.shadowRoot.querySelector(`.pv-elem[data-pi="${i}"]`);
            const pvAmb  = this.shadowRoot.querySelector(`.pv-amb[data-pi="${i}"]`);
            if (pvNode) pvNode.style[coord] = `${v}%`;
            if (pvAmb)  pvAmb.style[coord]  = `${v}%`;
          }
        });
      });

      s.querySelector('#pp-con') ?.addEventListener('input', e => set('color_on',  e.target.value));
      s.querySelector('#pp-coff')?.addEventListener('input', e => set('color_off', e.target.value));

      const ambColPicker = s.querySelector('#pp-ambcol');
      const ambAutoChk   = s.querySelector('#pp-ambcol-auto');
      ambColPicker?.addEventListener('input', e => {
        if (!ambAutoChk?.checked) set('ambience_color', e.target.value);
      });
      ambAutoChk?.addEventListener('change', e => {
        if (e.target.checked) {
          set('ambience_color', 'auto');
          if (ambColPicker) ambColPicker.disabled = true;
        } else {
          set('ambience_color', ambColPicker?.value || '#ffcc66');
          if (ambColPicker) ambColPicker.disabled = false;
        }
      });

      s.querySelector('#pp-showstate')?.addEventListener('change', e => set('show_state', e.target.checked));
      s.querySelector('#pp-showlabel')?.addEventListener('change', e => set('show_label', e.target.checked));
      s.querySelector('#pp-amb')?.addEventListener('change', e => setRender('ambience', e.target.checked));
      s.querySelector('#pp-tap')?.addEventListener('change', e => set('tap_action', e.target.value));
    }

    _emit() {
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: JSON.parse(JSON.stringify(this._config)) },
        bubbles: true,
        composed: true,
      }));
    }
  }

  customElements.define(EDITOR_NAME, EnhancedPictureElementsEditor);

  // ============================================================
  // REGISTRATION
  // ============================================================

  window.customCards = window.customCards || [];
  window.customCards.push({
    type: CARD_NAME,
    name: 'Enhanced Picture Elements',
    description:
      'Picture elements with visual drag-and-drop positioning, icon color controls, and ambient glow effects.',
    preview: true,
    documentationURL: 'https://github.com/pakkardkaw/kcw-hass-addons',
  });

  console.info(
    `%c ENHANCED-PICTURE-ELEMENTS %c v${VERSION} `,
    'color:#fff;background:#1565c0;font-weight:bold;padding:2px 8px;border-radius:4px 0 0 4px',
    'color:#fff;background:#0288d1;font-weight:bold;padding:2px 8px;border-radius:0 4px 4px 0'
  );
})();
