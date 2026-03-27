class DOM {
  static el(tag, cls) { const e = document.createElement(tag); if (cls) e.className = cls; return e; }
}

function injectStyles() {
  if (document.getElementById('iv-styles')) return;
  const style = document.createElement('style');
  style.id = 'iv-styles';
  style.textContent = `
.iv-container{ border:1px solid #ddd; background:var(--toolbar); padding:8px; border-radius:6px }
.iv-toolbar{ display:flex; gap:6px; margin-bottom:8px }
.iv-btn{ background:var(--btn); color:var(--btn-text); border:none; padding:6px 10px; border-radius:4px; cursor:pointer }
.iv-btn:hover{ opacity:0.9 }

.iv-overlay{ position:fixed; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.55); z-index:9999 }
.iv-overlay.visible{ display:flex }
.iv-modal{ background:transparent; border-radius:0; padding:0; max-width:none; max-height:none; box-shadow:none; display:flex; flex-direction:column; gap:0; width:100vw; height:100vh; position:relative }
.iv-close{ position:absolute; right:18px; top:14px; z-index:30 }
.iv-close svg{ width:18px; height:18px; fill:none; stroke:currentColor; stroke-width:2; }
.iv-view{ flex:1 1 auto; background:transparent; display:flex; align-items:center; justify-content:center; overflow:hidden; position:relative; min-width:320px; min-height:240px }
.iv-img{ max-width:none; max-height:none; user-select:none; will-change:transform; cursor:grab; transition: none; filter: drop-shadow(0 8px 30px rgba(0,0,0,0.6)) }

.iv-img.iv-rotate-anim{ transition: transform 300ms cubic-bezier(.22,.9,.32,1); }
.iv-img.iv-zoom-anim{ transition: transform 220ms cubic-bezier(.22,.9,.32,1); }

.iv-toolbar{ position:absolute; left:50%; transform:translateX(-50%); bottom:36px; display:flex; gap:12px; background:transparent; padding:0; z-index:15 }
.iv-btn{ width:52px; height:52px; border-radius:999px; background-color: rgba(195, 195, 195, 0.6); border:0; color:#fff; display:inline-flex; align-items:center; justify-content:center; cursor:pointer; backdrop-filter: blur(4px) }
.iv-btn svg{ width:22px; height:22px; fill:none; stroke:currentColor; stroke-width:1.6; stroke-linecap:round; stroke-linejoin:round; opacity:0.95 }
.iv-btn:hover{ background:rgba(215,215,215,0.6) }

@media (max-width:420px){ .iv-btn{ width:44px; height:44px } .iv-toolbar{ bottom:20px } }

@media (max-width:600px){ .iv-view{ height:50vh } }

.iv-loading{ position:absolute; inset:0; display:none; align-items:center; justify-content:center; background:rgba(0,0,0,0.25); z-index:12 }
.iv-loading.visible{ display:flex }
.iv-loading .spinner{ width:48px; height:48px; border-radius:50%; border:4px solid rgba(255,255,255,0.18); border-top-color: #fff; animation: iv-spin 1s linear infinite }
@keyframes iv-spin{ to{ transform:rotate(360deg) } }`;
  document.head.appendChild(style);
}

export class ImagePreview {
  constructor(container) {
    injectStyles();
    if (typeof container === 'string') container = document.querySelector(container);
    this.container = container || null;
    this._initUI();
    this._resetState();
    this._bindEvents();
    this._currentBlobUrl = null;
    this._rotationTarget = 0;
    this._isRotating = false;
    this._lastErrorHandler = null;
    this._fileName = null;
  }

  static view(url, fileName) {
    if (!url) throw new Error('url required');
    if (!ImagePreview._shared) {
      ImagePreview._shared = new ImagePreview(null);
    }
    const inst = ImagePreview._shared;
    inst._lastErrorHandler = null;
    inst._fileName = fileName || null;

    let loadPromise = null;
    const startLoad = () => {
      if (loadPromise) return loadPromise;
      loadPromise = inst.load(url).catch(err => {
        try { inst.hide(); } catch (e) {}
        if (typeof inst._lastErrorHandler === 'function') {
          try { inst._lastErrorHandler(err); } catch (e) {}
        }
        return Promise.reject(err);
      });
      return loadPromise;
    };

    Promise.resolve().then(startLoad);

    const ctrl = {
      error(cb) { inst._lastErrorHandler = cb; return ctrl; },
      then(...args) { return startLoad().then(...args); },
      catch(...args) { return startLoad().catch(...args); },
      finally(...args) { return startLoad().finally(...args); }
    };

    return ctrl;
  }

  _initUI() {
    this.overlay = DOM.el('div','iv-overlay');
    this.modal = DOM.el('div','iv-modal');

    this.closeBtn = DOM.el('button','iv-btn iv-close'); this.closeBtn.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 6L6 18M6 6l12 12"/></svg>';

    this.toolbar = DOM.el('div','iv-toolbar');
    const actions = [
      { action: 'rotate-left', svg: '<svg t="1774596249534" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="27117" width="32" height="32"><path d="M184.32 743.68c14.080-5.119 29.44-1.28 39.68 10.24v0c81.92 104.96 225.28 149.76 357.12 102.4 165.12-58.88 250.88-241.92 192-407.040-58.88-165.12-241.92-250.88-407.040-192-5.12 2.56-11.52 3.84-16.64 6.4 6.4 17.92 12.8 35.84 17.92 51.2 7.68 21.76 14.080 38.4 15.36 43.52 0 0 0 0 0 0 3.84 5.12 3.84 12.8 1.281 19.2-5.12 10.24-16.64 14.080-26.88 10.24 0 0 0 0 0 0h-1.28l-19.2-8.96-130.56-61.441-33.28-16.64c-5.12-2.56-8.96-6.4-10.24-11.52s-1.28-10.24 1.28-15.36l16.64-33.28 61.441-130.56 7.68-20.48v-1.28c0 0 0 0 0 0 5.12-10.24 16.64-14.080 26.88-8.96 6.4 2.56 10.24 8.96 11.52 15.36 0 0 0 0 0 0 2.56 5.12 7.68 21.76 15.36 43.52 6.4 16.64 12.8 35.84 20.48 56.32 5.12-2.56 11.519-5.12 16.64-6.4 204.8-72.96 427.52 33.28 500.48 236.8 72.96 203.52-33.28 427.52-235.52 499.2-160 57.6-332.8 3.84-433.92-120.32-3.84-3.84-7.68-8.96-8.96-14.080-7.68-17.92 2.56-39.68 21.76-46.080z" p-id="27118" fill="#fff"></path></svg>' },
      { action: 'rotate-right', svg: '<svg t="1774596169852" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="25052" width="32" height="32"><path d="M862.325 759.5c-15.05-5.475-31.475-1.375-42.425 10.95l0 0c-87.6 112.225-240.85 160.125-381.8 109.475C261.575 816.95 169.875 621.25 232.825 444.76c62.95-176.55 258.635-268.225 435.15-205.3 5.475 2.75 12.325 4.125 17.8 6.875-6.825 19.15-13.675 38.3-19.15 54.7-8.225 23.3-15.05 41.075-16.425 46.575l0 0c-4.1 5.45-4.1 13.675-1.35 20.5 5.45 10.95 17.775 15.075 28.725 10.95l0 0 1.375 0 20.525-9.575 139.575-65.7 19.15-9.55 16.425-8.2c5.475-2.75 9.575-6.875 10.95-12.325 1.375-5.5 1.375-10.95-1.375-16.45l-8.2-16.425-8.2-20.525-65.7-139.6-9.575-20.5 0-1.375 0 0c-5.475-10.95-17.775-15.075-28.725-9.6-6.85 2.75-10.95 9.6-12.325 16.45l0 0c-2.725 5.475-8.225 23.25-16.425 46.525-6.85 17.8-13.675 38.325-21.9 60.2-5.475-2.725-12.3-5.475-17.775-6.825-218.95-78-457.075 35.575-535.075 253.175-78 217.56 35.575 457.035 251.8 533.685 171.05 61.6 355.8 4.1 463.9-128.625 4.1-4.125 8.2-9.575 9.575-15.075C893.8 789.6 882.85 766.325 862.325 759.5z" p-id="25053" fill="#fff"></path></svg>' },
      { action: 'zoom-out', svg: '<svg t="1774597118125" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="36570" width="32" height="32"><path d="M426.666667 853.333333C192 853.333333 0 661.333333 0 426.666667S192 0 426.666667 0s426.666667 192 426.666666 426.666667-192 426.666667-426.666666 426.666666z m0-768c-187.733333 0-341.333333 153.6-341.333334 341.333334s153.6 341.333333 341.333334 341.333333 341.333333-153.6 341.333333-341.333333-153.6-341.333333-341.333333-341.333334z" fill="#ffffff" p-id="36571"></path><path d="M981.333333 1024c-12.8 0-21.333333-4.266667-29.866666-12.8l-281.6-281.6c-17.066667-17.066667-17.066667-42.666667 0-59.733333s42.666667-17.066667 59.733333 0l281.6 281.6c17.066667 17.066667 17.066667 42.666667 0 59.733333-8.533333 8.533333-17.066667 12.8-29.866667 12.8zM601.6 465.066667h-341.333333c-25.6 0-42.666667-17.066667-42.666667-42.666667s17.066667-42.666667 42.666667-42.666667h341.333333c25.6 0 42.666667 17.066667 42.666667 42.666667s-17.066667 42.666667-42.666667 42.666667z" fill="#ffffff" p-id="36572"></path></svg>' },
      { action: 'zoom-in', svg: '<svg t="1774597058039" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="34590" width="32" height="32"><path d="M1011.2 951.466667l-256-256c59.733333-72.533333 98.133333-166.4 98.133333-268.8 0-234.666667-192-426.666667-426.666666-426.666667S0 192 0 426.666667s192 426.666667 426.666667 426.666666c102.4 0 196.266667-34.133333 268.8-98.133333l256 256c8.533333 8.533333 21.333333 12.8 29.866666 12.8s21.333333-4.266667 29.866667-12.8c17.066667-17.066667 17.066667-42.666667 0-59.733333zM85.333333 426.666667c0-187.733333 153.6-341.333333 341.333334-341.333334s341.333333 153.6 341.333333 341.333334-153.6 341.333333-341.333333 341.333333-341.333333-153.6-341.333334-341.333333z" fill="#ffffff" p-id="34591"></path><path d="M601.6 379.733333h-128v-128c0-25.6-17.066667-42.666667-42.666667-42.666666s-42.666667 17.066667-42.666666 42.666666v128h-128c-25.6 0-42.666667 17.066667-42.666667 42.666667s17.066667 42.666667 42.666667 42.666667h128v128c0 25.6 17.066667 42.666667 42.666666 42.666666s42.666667-17.066667 42.666667-42.666666v-128h128c25.6 0 42.666667-17.066667 42.666667-42.666667s-17.066667-42.666667-42.666667-42.666667z" fill="#ffffff" p-id="34592"></path></svg>' },
      { action: 'reset', svg: '<svg t="1774596896583" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="32043" width="32" height="32"><path d="M168 504.2c1-43.7 10-86.1 26.9-126 17.3-41 42.1-77.7 73.7-109.4C300.2 237.1 337 212.3 378 195c42.4-17.9 87.4-27 133.9-27s91.5 9.1 133.8 27c40.9 17.3 77.7 42.1 109.3 73.8 9.9 9.9 19.2 20.4 27.8 31.4l-60.2 47c-5.3 4.1-3.5 12.5 3 14.1l175.7 43c5 1.2 9.9-2.6 9.9-7.7l0.8-180.9c0-6.7-7.7-10.5-12.9-6.3l-56.4 44.1C765.8 155.1 646.2 92 511.8 92 282.7 92 96.3 275.6 91.998 503.8 91.9 508.3 95.5 512 100 512h60c4.4 0 7.9-3.5 8-7.8z m756 7.8h-60c-4.4 0-7.9 3.5-8 7.8-1 43.7-10 86.1-26.9 126-17.3 41-42.1 77.8-73.7 109.4C723.8 786.8 687 811.7 646 829c-42.4 17.9-87.4 27-133.9 27s-91.5-9.1-133.9-27c-40.9-17.3-77.7-42.1-109.3-73.8-9.9-9.9-19.2-20.4-27.8-31.4l60.2-47c5.3-4.1 3.5-12.5-3-14.1l-175.7-43c-5-1.2-9.9 2.6-9.9 7.7l-0.7 181c0 6.7 7.7 10.5 12.9 6.3l56.4-44.1C258.2 868.9 377.8 932 512.2 932c229.2 0 415.5-183.7 419.802-411.8 0.098-4.5-3.502-8.2-8.002-8.2z" fill="#fff" p-id="32044"></path></svg>' },
      { action: 'download', svg: '<svg t="1774596987600" class="icon" viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg" p-id="33490" width="32" height="32"><path d="M928.704 895.808c-0.032 0-0.064 0-0.064 0L95.328 895.808 95.264 895.808c-17.888 0-32.384 14.496-32.384 32.448 0 17.888 14.528 32.384 32.384 32.384l0.064 0 833.344 0c0 0 0.032 0 0.064 0 17.92 0 32.384-14.496 32.384-32.384C961.088 910.304 946.624 895.808 928.704 895.808zM487.68 826.56c6.08 6.08 14.368 9.92 23.616 9.92l0 0 0 0c9.248-0.032 17.568-3.776 23.584-9.952l311.968-312c6.016-6.016 9.888-14.336 9.888-23.52 0-18.336-14.944-33.152-33.184-33.184-9.248-0.064-17.504 3.744-23.552 9.792l-255.456 255.52-0.064-626.464c0 0 0 0 0-0.064 0-18.336-14.848-33.216-33.12-33.248-18.336 0.032-33.184 14.912-33.184 33.248 0 0 0 0.032 0 0.064l-0.032 626.4L222.656 467.52c-5.984-6.016-14.336-9.76-23.52-9.76-18.304 0-33.184 14.88-33.216 33.184 0 9.184 3.776 17.568 9.856 23.488L487.68 826.56z" fill="#fff" p-id="33491"></path></svg>' }
    ];
    actions.forEach(a=>{
      const btn = DOM.el('button','iv-btn'); 
      btn.dataset.action = a.action; 
      btn.innerHTML = a.svg; 
      if (a.action === 'download') this.downloadBtn = btn;
      this.toolbar.appendChild(btn);
    });

    this.view = DOM.el('div','iv-view');
    this.img = DOM.el('img','iv-img');
    this.img.draggable = false;
    this.img.style.transformOrigin = '0 0';
    this.img.style.position = 'absolute';
    this.img.style.left = '0px';
    this.img.style.top = '0px';
    this.view.appendChild(this.img);
    this.loader = DOM.el('div','iv-loading');
    this.loader.innerHTML = '<div class="spinner"></div>';
    this.view.appendChild(this.loader);

    this.fileNameLabel = DOM.el('div','iv-filename');
    this.fileNameLabel.style.cssText = 'position:absolute; left:50%; transform:translateX(-50%); bottom:10px; color:#fff; font-size:14px; max-width:80%; text-align:center; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; opacity:0.8;';
    this.fileNameLabel.style.display = 'none';

    this.modal.appendChild(this.closeBtn);
    this.modal.appendChild(this.view);
    this.modal.appendChild(this.toolbar);
    this.modal.appendChild(this.fileNameLabel);
    this.overlay.appendChild(this.modal);
    document.body.appendChild(this.overlay);
  }

  _resetState(){
    if (this._rotateRaf) { cancelAnimationFrame(this._rotateRaf); this._rotateRaf = null; }
    if (this._rotateAnimTimer) { clearTimeout(this._rotateAnimTimer); this._rotateAnimTimer = null; }
    if (this._zoomAnimTimer) { clearTimeout(this._zoomAnimTimer); this._zoomAnimTimer = null; }

    if (this.img) {
      this.img.classList.remove('iv-zoom-anim', 'iv-rotate-anim');
      this.img.style.willChange = '';
      if (this.img.style.filter === 'none') this.img.style.filter = '';
    }

    if (this.img && this.img.src && this._initialState) {
      this.rotation = typeof this._initialState.rotation === 'number' ? this._initialState.rotation : 0;
      this.scale = typeof this._initialState.scale === 'number' ? this._initialState.scale : 1;
      this.tx = typeof this._initialState.tx === 'number' ? this._initialState.tx : 0;
      this.ty = typeof this._initialState.ty === 'number' ? this._initialState.ty : 0;
    } else {
      this.rotation = 0; this.scale = 1; this.tx = 0; this.ty = 0;
    }

    const normalize = (a) => {
      if (typeof a !== 'number' || !isFinite(a)) return 0;
      return ((Math.round(a) % 360) + 360) % 360;
    };
    this.rotation = normalize(this.rotation);
    this._rotationTarget = this.rotation;
    this._isRotating = false;

    this.isPanning = false; this.panStart = {x:0,y:0};
    this._renderTransform();
  }

  _bindEvents(){
    this.toolbar.addEventListener('click', (e)=>{
      const btn = e.target.closest('button'); if (!btn) return;
      const act = btn.dataset.action;
      if (act === 'rotate-left') this.rotate(-90);
      if (act === 'rotate-right') this.rotate(90);
      if (act === 'zoom-out') this.zoom(0.9);
      if (act === 'zoom-in') this.zoom(1.1);
      if (act === 'reset') this.reset();
      if (act === 'download') this.download();
    });

    this.view.addEventListener('wheel', (e)=>{
      e.preventDefault();
      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      this.zoomAt(delta, e.clientX, e.clientY);
    }, { passive: false });

    this.view.addEventListener('mousedown', (e)=>{
      e.preventDefault(); this.isPanning = true; this.panStart = {x: e.clientX - this.tx, y: e.clientY - this.ty};
    });
    window.addEventListener('mousemove', (e)=>{
      if (!this.isPanning) return; this.tx = e.clientX - this.panStart.x; this.ty = e.clientY - this.panStart.y; this._renderTransform();
    });
    window.addEventListener('mouseup', ()=>{ this.isPanning = false; });

    this.view.addEventListener('dblclick', ()=> this.reset());

    this.closeBtn.addEventListener('click', (e)=>{ e.stopPropagation(); this.hide(); });
    this.overlay.addEventListener('click', (e)=>{
      if (e.target.closest('.iv-img') || e.target.closest('.iv-toolbar') || e.target === this.closeBtn) return;
      this.hide();
    });
    window.addEventListener('keydown', (e)=>{ if (e.key === 'Escape') this.hide(); });
  }

  async load(url){
    if (!url) throw new Error('url required');
    try{ this.img.onload = null; this.img.onerror = null; this.img.src = ''; }catch(e){}
    this.img.style.visibility = 'hidden';
    this.show();
    this.loader.classList.add('visible');
    if (this._currentBlobUrl) { URL.revokeObjectURL(this._currentBlobUrl); this._currentBlobUrl = null; }

    try{
      const resp = await fetch(url);
      if (!resp.ok) throw new Error('网络错误 ' + resp.status);
      const blob = await resp.blob();
      const blobUrl = URL.createObjectURL(blob);
      this._currentBlob = blob; this._currentBlobUrl = blobUrl;
      this.img.onload = ()=>{
        this.rotation = 0;
        this.isPanning = false;
        this.panStart = {x:0,y:0};

        const viewRect = this.view.getBoundingClientRect();
        const margin = 0.95;
        const iw = this.img.naturalWidth || this.img.width || viewRect.width;
        const ih = this.img.naturalHeight || this.img.height || viewRect.height;
        const fitScale = Math.min(1, (viewRect.width * margin) / iw, (viewRect.height * margin) / ih);
        this.scale = Math.max(1e-6, fitScale);

        const scaledW = this.scale * iw;
        const scaledH = this.scale * ih;
        this.tx = (viewRect.width - scaledW) / 2;
        this.ty = (viewRect.height - scaledH) / 2;

        this._initialState = { rotation: 0, scale: this.scale, tx: this.tx, ty: this.ty };

        this.loader.classList.remove('visible');
        this.img.style.visibility = 'visible';
        this._renderTransform();
      };
      this.img.onerror = ()=>{ this.loader.classList.remove('visible'); this.img.style.visibility = 'hidden'; };
      this.img.src = blobUrl;
    }catch(err){
      this.loader.classList.remove('visible');
      throw err;
    }
  }

  rotate(deg){
    const stepDeg = Math.round(deg / 90) * 90;
    if (stepDeg === 0) return;

    this._rotationTarget = (typeof this._rotationTarget === 'number' ? this._rotationTarget : (this.rotation || 0)) + stepDeg;

    if (this._rotateRaf) { cancelAnimationFrame(this._rotateRaf); this._rotateRaf = null; }
    if (this._rotateAnimTimer) { clearTimeout(this._rotateAnimTimer); this._rotateAnimTimer = null; }

    const animDur = 220;
    const startRot = this.rotation || 0;
    const targetRot = this._rotationTarget;

    const s = Math.max(1e-6, this.scale);

    const rect = this.img.getBoundingClientRect();
    const w = this.img.naturalWidth || this.img.width || rect.width;
    const h = this.img.naturalHeight || this.img.height || rect.height;
    const cx = w / 2;
    const cy = h / 2;

    const mOld = new DOMMatrix();
    mOld.translateSelf(this.tx, this.ty);
    mOld.scaleSelf(s, s);
    mOld.rotateSelf(startRot);
    const pLocal = new DOMPoint(cx, cy);
    const pScreen = mOld.transformPoint(pLocal);

    const start = performance.now();
    const ease = t => 1 - Math.pow(1 - t, 4);

    const prevFilter = this.img.style.filter;
    this.img.style.filter = 'none';
    this.img.style.willChange = 'transform';

    this._isRotating = true;

    const step = (now) => {
      const t = Math.min(1, (now - start) / animDur);
      const e = ease(t);
      const curRot = startRot + (targetRot - startRot) * e;

      const body = new DOMMatrix();
      body.scaleSelf(s, s);
      body.rotateSelf(curRot);
      const pBody = body.transformPoint(pLocal);

      this.rotation = curRot;
      this.tx = pScreen.x - pBody.x;
      this.ty = pScreen.y - pBody.y;

      if (t === 1) {
        const snap = v => Math.round(v * 100) / 100;
        this.tx = snap(this.tx);
        this.ty = snap(this.ty);
        this.rotation = targetRot;
        this._renderTransform();
        this.img.style.filter = prevFilter;
        this.img.style.willChange = '';
        this._rotateRaf = null;
        this._isRotating = false;
        this._rotationTarget = this.rotation;
        return;
      }

      this._renderTransform();
      this._rotateRaf = requestAnimationFrame(step);
    };

    this._rotateRaf = requestAnimationFrame(step);
  }
  zoom(factor){
    const prevScale = this.scale;
    const nextScale = Math.max(0.1, Math.min(10, prevScale * factor));
    if (Math.abs(nextScale - prevScale) < 1e-9) return;

    const zoomAnimClass = 'iv-zoom-anim';
    const zoomAnimDuration = 220;
    if (this._zoomAnimTimer) { clearTimeout(this._zoomAnimTimer); this._zoomAnimTimer = null; }
    const zoomEnd = (ev)=>{
      if (ev && ev.propertyName && ev.propertyName !== 'transform') return;
      this.img.classList.remove(zoomAnimClass);
      this.img.removeEventListener('transitionend', zoomEnd);
      if (this._zoomAnimTimer) { clearTimeout(this._zoomAnimTimer); this._zoomAnimTimer = null; }
    };
    this.img.addEventListener('transitionend', zoomEnd);
    this.img.classList.add(zoomAnimClass);
    this._zoomAnimTimer = setTimeout(()=>{ zoomEnd(); }, zoomAnimDuration + 40);

    const rect = this.img.getBoundingClientRect();
    const w = this.img.naturalWidth || this.img.width || rect.width;
    const h = this.img.naturalHeight || this.img.height || rect.height;
    const cx = w / 2;
    const cy = h / 2;

    const rad = (this.rotation || 0) * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);

    const screenX = this.tx + prevScale * (c * cx - s * cy);
    const screenY = this.ty + prevScale * (s * cx + c * cy);

    const newTx = screenX - nextScale * (c * cx - s * cy);
    const newTy = screenY - nextScale * (s * cx + c * cy);

    this.scale = nextScale;
    this.tx = newTx;
    this.ty = newTy;
    this._renderTransform();
  }

  zoomAt(factor, clientX, clientY){
    const prevScale = this.scale;
    const nextScale = Math.max(0.1, Math.min(10, prevScale * factor));
    if (Math.abs(nextScale - prevScale) < 1e-6) return;

    const style = getComputedStyle(this.img);
    const m = style.transform === 'none' ? new DOMMatrix() : new DOMMatrix(style.transform);

    const inv = m.inverse();
    const pt = inv.transformPoint(new DOMPoint(clientX, clientY));

    const rad = (this.rotation || 0) * Math.PI / 180;
    const c = Math.cos(rad), s = Math.sin(rad);
    const lx = pt.x, ly = pt.y;
    const vx = nextScale * (c * lx - s * ly);
    const vy = nextScale * (s * lx + c * ly);

    const txNew = clientX - vx;
    const tyNew = clientY - vy;

    this.scale = nextScale;
    this.tx = txNew;
    this.ty = tyNew;
    const zoomAnimClass2 = 'iv-zoom-anim';
    const zoomAnimDuration2 = 220;
    if (this._zoomAnimTimer) { clearTimeout(this._zoomAnimTimer); this._zoomAnimTimer = null; }
    const zoomEnd2 = (ev)=>{
      if (ev && ev.propertyName && ev.propertyName !== 'transform') return;
      this.img.classList.remove(zoomAnimClass2);
      this.img.removeEventListener('transitionend', zoomEnd2);
      if (this._zoomAnimTimer) { clearTimeout(this._zoomAnimTimer); this._zoomAnimTimer = null; }
    };
    this.img.addEventListener('transitionend', zoomEnd2);
    this.img.classList.add(zoomAnimClass2);
    this._zoomAnimTimer = setTimeout(()=>{ zoomEnd2(); }, zoomAnimDuration2 + 40);
    this._renderTransform();
  }

  reset(){ this._resetState(); if (this.img.src) { } }

  download(){
    if (!this._currentBlob) return alert('暂无图片可下载');
    const a = document.createElement('a');
    a.href = this._currentBlobUrl; a.download = this._fileName || this._suggestFilename() || 'image';
    document.body.appendChild(a); a.click(); a.remove();
  }

  _suggestFilename(){
    try{ const url = new URL(this.img.src); const parts = url.pathname.split('/'); return parts.pop() || null; }catch{ return null; }
  }

  _updateFileNameLabel(){
    if (this._fileName) {
      this.fileNameLabel.textContent = this._fileName;
      this.fileNameLabel.style.display = 'block';
      this.downloadBtn.style.display = 'inline-flex';
    } else {
      this.fileNameLabel.textContent = '';
      this.fileNameLabel.style.display = 'none';
      this.downloadBtn.style.display = 'none';
    }
  }

  _renderTransform(){
    this.img.style.transform = `translate(${this.tx}px, ${this.ty}px) scale(${this.scale}) rotate(${this.rotation}deg)`;
  }

  show(){
    if (this.overlay) this.overlay.classList.add('visible');
    this._updateFileNameLabel();
  }

  hide(){
    if (this.overlay) this.overlay.classList.remove('visible');
  }
}

export default ImagePreview;
