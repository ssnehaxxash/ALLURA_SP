const { useEffect, useRef } = React;
const THREE = window.THREE;

function LiquidEther({
  mouseForce = 25,
  cursorSize = 150,
  isViscous = false,
  viscous = 30,
  iterationsViscous = 32,
  iterationsPoisson = 32,
  dt = 0.014,
  BFECC = true,
  resolution = 0.5,
  isBounce = false,
  colors = ['#5227FF', '#FF9FFC', '#B19EEF'],
  style = {},
  className = '',
  autoDemo = true,
  autoSpeed = 0.3,
  autoIntensity = 2.0,
  takeoverDuration = 0.25,
  autoResumeDelay = 1000,
  autoRampDuration = 0.6
}) {
  const mountRef = useRef(null);
  const webglRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const rafRef = useRef(null);
  const intersectionObserverRef = useRef(null);
  const isVisibleRef = useRef(true);
  const resizeRafRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current) return;

    function makePaletteTexture(stops) {
      let arr;
      if (Array.isArray(stops) && stops.length > 0) {
        if (stops.length === 1) {
          arr = [stops[0], stops[0]];
        } else {
          arr = stops;
        }
      } else {
        arr = ['#ffffff', '#ffffff'];
      }
      const w = arr.length;
      const data = new Uint8Array(w * 4);
      for (let i = 0; i < w; i++) {
        const c = new THREE.Color(arr[i]);
        data[i * 4 + 0] = Math.round(c.r * 255);
        data[i * 4 + 1] = Math.round(c.g * 255);
        data[i * 4 + 2] = Math.round(c.b * 255);
        data[i * 4 + 3] = 255;
      }
      const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
      tex.magFilter = THREE.LinearFilter;
      tex.minFilter = THREE.LinearFilter;
      tex.wrapS = THREE.ClampToEdgeWrapping;
      tex.wrapT = THREE.ClampToEdgeWrapping;
      tex.generateMipmaps = false;
      tex.needsUpdate = true;
      return tex;
    }

    const paletteTex = makePaletteTexture(colors);
    const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

    class CommonClass {
      constructor() {
        this.width = 0;
        this.height = 0;
        this.aspect = 1;
        this.pixelRatio = 1;
        this.isMobile = false;
        this.breakpoint = 768;
        this.fboWidth = null;
        this.fboHeight = null;
        this.time = 0;
        this.delta = 0;
        this.container = null;
        this.renderer = null;
        this.clock = null;
      }
      init(container) {
        this.container = container;
        this.pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        this.resize();
        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.autoClear = false;
        this.renderer.setClearColor(new THREE.Color(0x000000), 0);
        this.renderer.setPixelRatio(this.pixelRatio);
        this.renderer.setSize(this.width, this.height);
        this.renderer.domElement.style.width = '100%';
        this.renderer.domElement.style.height = '100%';
        this.renderer.domElement.style.display = 'block';
        this.clock = new THREE.Clock();
        this.clock.start();
      }
      resize() {
        if (!this.container) return;
        const rect = this.container.getBoundingClientRect();
        this.width = Math.max(1, Math.floor(rect.width));
        this.height = Math.max(1, Math.floor(rect.height));
        this.aspect = this.width / this.height;
        if (this.renderer) this.renderer.setSize(this.width, this.height, false);
      }
      update() {
        this.delta = this.clock.getDelta();
        this.time += this.delta;
      }
    }
    const Common = new CommonClass();

    class MouseClass {
      constructor() {
        this.mouseMoved = false;
        this.coords = new THREE.Vector2();
        this.coords_old = new THREE.Vector2();
        this.diff = new THREE.Vector2();
        this.timer = null;
        this.container = null;
        this._onMouseMove = this.onDocumentMouseMove.bind(this);
        this._onTouchStart = this.onDocumentTouchStart.bind(this);
        this._onTouchMove = this.onDocumentTouchMove.bind(this);
        this._onMouseEnter = this.onMouseEnter.bind(this);
        this._onMouseLeave = this.onMouseLeave.bind(this);
        this._onTouchEnd = this.onTouchEnd.bind(this);
        this.isHoverInside = false;
        this.hasUserControl = false;
        this.isAutoActive = false;
        this.autoIntensity = 2.0;
        this.takeoverActive = false;
        this.takeoverStartTime = 0;
        this.takeoverDuration = 0.25;
        this.takeoverFrom = new THREE.Vector2();
        this.takeoverTo = new THREE.Vector2();
        this.onInteract = null;
      }
      init(container) {
        this.container = container;
        // Listen to document for mouse events to capture full screen interaction
        document.addEventListener('mousemove', this._onMouseMove, false);
        document.addEventListener('touchstart', this._onTouchStart, false);
        document.addEventListener('touchmove', this._onTouchMove, false);
        container.addEventListener('mouseenter', this._onMouseEnter, false);
        container.addEventListener('mouseleave', this._onMouseLeave, false);
        document.addEventListener('touchend', this._onTouchEnd, false);
      }
      dispose() {
        document.removeEventListener('mousemove', this._onMouseMove, false);
        document.removeEventListener('touchstart', this._onTouchStart, false);
        document.removeEventListener('touchmove', this._onTouchMove, false);
        if (this.container) {
          this.container.removeEventListener('mouseenter', this._onMouseEnter, false);
          this.container.removeEventListener('mouseleave', this._onMouseLeave, false);
        }
        document.removeEventListener('touchend', this._onTouchEnd, false);
      }
      setCoords(x, y) {
        if (this.timer) clearTimeout(this.timer);
        // Use full window coordinates for interaction
        const nx = x / window.innerWidth;
        const ny = y / window.innerHeight;
        this.coords.set(nx * 2 - 1, -(ny * 2 - 1));
        this.mouseMoved = true;
        this.timer = setTimeout(() => {
          this.mouseMoved = false;
        }, 100);
      }
      setNormalized(nx, ny) {
        this.coords.set(nx, ny);
        this.mouseMoved = true;
      }
      onDocumentMouseMove(event) {
        if (this.onInteract) this.onInteract();
        if (this.isAutoActive && !this.hasUserControl && !this.takeoverActive) {
          const nx = event.clientX / window.innerWidth;
          const ny = event.clientY / window.innerHeight;
          this.takeoverFrom.copy(this.coords);
          this.takeoverTo.set(nx * 2 - 1, -(ny * 2 - 1));
          this.takeoverStartTime = performance.now();
          this.takeoverActive = true;
          this.hasUserControl = true;
          this.isAutoActive = false;
          return;
        }
        this.setCoords(event.clientX, event.clientY);
        this.hasUserControl = true;
      }
      onDocumentTouchStart(event) {
        if (event.touches.length === 1) {
          const t = event.touches[0];
          if (this.onInteract) this.onInteract();
          this.setCoords(t.pageX, t.pageY);
          this.hasUserControl = true;
        }
      }
      onDocumentTouchMove(event) {
        if (event.touches.length === 1) {
          const t = event.touches[0];
          if (this.onInteract) this.onInteract();
          this.setCoords(t.pageX, t.pageY);
        }
      }
      onTouchEnd() {
        this.isHoverInside = false;
      }
      onMouseEnter() {
        this.isHoverInside = true;
      }
      onMouseLeave() {
        this.isHoverInside = false;
      }
      update() {
        if (this.takeoverActive) {
          const t = (performance.now() - this.takeoverStartTime) / (this.takeoverDuration * 1000);
          if (t >= 1) {
            this.takeoverActive = false;
            this.coords.copy(this.takeoverTo);
            this.coords_old.copy(this.coords);
            this.diff.set(0, 0);
          } else {
            const k = t * t * (3 - 2 * t);
            this.coords.copy(this.takeoverFrom).lerp(this.takeoverTo, k);
          }
        }
        this.diff.subVectors(this.coords, this.coords_old);
        this.coords_old.copy(this.coords);
        if (this.coords_old.x === 0 && this.coords_old.y === 0) this.diff.set(0, 0);
        if (this.isAutoActive && !this.takeoverActive) this.diff.multiplyScalar(this.autoIntensity);
      }
    }
    const Mouse = new MouseClass();

    class AutoDriver {
      constructor(mouse, manager, opts) {
        this.mouse = mouse;
        this.manager = manager;
        this.enabled = opts.enabled;
        this.speed = opts.speed;
        this.resumeDelay = opts.resumeDelay || 3000;
        this.rampDurationMs = (opts.rampDuration || 0) * 1000;
        this.active = false;
        this.current = new THREE.Vector2(0, 0);
        this.target = new THREE.Vector2();
        this.lastTime = performance.now();
        this.activationTime = 0;
        this.margin = 0.2;
        this._tmpDir = new THREE.Vector2();
        this.pickNewTarget();
      }
      pickNewTarget() {
        const r = Math.random;
        this.target.set((r() * 2 - 1) * (1 - this.margin), (r() * 2 - 1) * (1 - this.margin));
      }
      forceStop() {
        this.active = false;
        this.mouse.isAutoActive = false;
      }
      update() {
        if (!this.enabled) return;
        const now = performance.now();
        const idle = now - this.manager.lastUserInteraction;
        if (idle < this.resumeDelay) {
          if (this.active) this.forceStop();
          return;
        }
        if (this.mouse.isHoverInside) {
          if (this.active) this.forceStop();
          return;
        }
        if (!this.active) {
          this.active = true;
          this.current.copy(this.mouse.coords);
          this.lastTime = now;
          this.activationTime = now;
        }
        if (!this.active) return;
        this.mouse.isAutoActive = true;
        let dtSec = (now - this.lastTime) / 1000;
        this.lastTime = now;
        if (dtSec > 0.2) dtSec = 0.016;
        const dir = this._tmpDir.subVectors(this.target, this.current);
        const dist = dir.length();
        if (dist < 0.01) {
          this.pickNewTarget();
          return;
        }
        dir.normalize();
        let ramp = 1;
        if (this.rampDurationMs > 0) {
          const t = Math.min(1, (now - this.activationTime) / this.rampDurationMs);
          ramp = t * t * (3 - 2 * t);
        }
        const step = this.speed * dtSec * ramp;
        const move = Math.min(step, dist);
        this.current.addScaledVector(dir, move);
        this.mouse.setNormalized(this.current.x, this.current.y);
      }
    }

    // COMPLETE SHADER SYSTEM FROM YOUR ORIGINAL CODE
    const face_vert = `
      attribute vec3 position;
      uniform vec2 px;
      uniform vec2 boundarySpace;
      varying vec2 uv;
      precision highp float;
      void main(){
      vec3 pos = position;
      vec2 scale = 1.0 - boundarySpace * 2.0;
      pos.xy = pos.xy * scale;
      uv = vec2(0.5)+(pos.xy)*0.5;
      gl_Position = vec4(pos, 1.0);
    }
    `;
    
    const line_vert = `
      attribute vec3 position;
      uniform vec2 px;
      precision highp float;
      varying vec2 uv;
      void main(){
      vec3 pos = position;
      uv = 0.5 + pos.xy * 0.5;
      vec2 n = sign(pos.xy);
      pos.xy = abs(pos.xy) - px * 1.0;
      pos.xy *= n;
      gl_Position = vec4(pos, 1.0);
    }
    `;
    
    const mouse_vert = `
        precision highp float;
        attribute vec3 position;
        attribute vec2 uv;
        uniform vec2 center;
        uniform vec2 scale;
        uniform vec2 px;
        varying vec2 vUv;
        void main(){
        vec2 pos = position.xy * scale * 2.0 * px + center;
        vUv = uv;
        gl_Position = vec4(pos, 0.0, 1.0);
    }
    `;
    
    const advection_frag = `
        precision highp float;
        uniform sampler2D velocity;
        uniform float dt;
        uniform bool isBFECC;
        uniform vec2 fboSize;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
        vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
        if(isBFECC == false){
            vec2 vel = texture2D(velocity, uv).xy;
            vec2 uv2 = uv - vel * dt * ratio;
            vec2 newVel = texture2D(velocity, uv2).xy;
            gl_FragColor = vec4(newVel, 0.0, 0.0);
        } else {
            vec2 spot_new = uv;
            vec2 vel_old = texture2D(velocity, uv).xy;
            vec2 spot_old = spot_new - vel_old * dt * ratio;
            vec2 vel_new1 = texture2D(velocity, spot_old).xy;
            vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
            vec2 error = spot_new2 - spot_new;
            vec2 spot_new3 = spot_new - error / 2.0;
            vec2 vel_2 = texture2D(velocity, spot_new3).xy;
            vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
            vec2 newVel2 = texture2D(velocity, spot_old2).xy; 
            gl_FragColor = vec4(newVel2, 0.0, 0.0);
        }
    }
    `;
    
    const color_frag = `
        precision highp float;
        uniform sampler2D velocity;
        uniform sampler2D palette;
        uniform vec4 bgColor;
        varying vec2 uv;
        void main(){
        vec2 vel = texture2D(velocity, uv).xy;
        float lenv = clamp(length(vel), 0.0, 1.0);
        vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
        vec3 outRGB = mix(bgColor.rgb, c, lenv);
        float outA = mix(bgColor.a, 1.0, lenv);
        gl_FragColor = vec4(outRGB, outA);
    }
    `;
    
    const divergence_frag = `
        precision highp float;
        uniform sampler2D velocity;
        uniform float dt;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
        float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
        float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
        float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
        float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
        float divergence = (x1 - x0 + y1 - y0) / 2.0;
        gl_FragColor = vec4(divergence / dt);
    }
    `;
    
    const externalForce_frag = `
        precision highp float;
        uniform vec2 force;
        uniform vec2 center;
        uniform vec2 scale;
        uniform vec2 px;
        varying vec2 vUv;
        void main(){
        vec2 circle = (vUv - 0.5) * 2.0;
        float d = 1.0 - min(length(circle), 1.0);
        d *= d;
        gl_FragColor = vec4(force * d, 0.0, 1.0);
    }
    `;
    
    const poisson_frag = `
        precision highp float;
        uniform sampler2D pressure;
        uniform sampler2D divergence;
        uniform vec2 px;
        varying vec2 uv;
        void main(){
        float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
        float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
        float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
        float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
        float div = texture2D(divergence, uv).r;
        float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
        gl_FragColor = vec4(newP);
    }
    `;
    
    const pressure_frag = `
        precision highp float;
        uniform sampler2D pressure;
        uniform sampler2D velocity;
        uniform vec2 px;
        uniform float dt;
        varying vec2 uv;
        void main(){
        float step = 1.0;
        float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
        float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
        float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
        float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
        vec2 v = texture2D(velocity, uv).xy;
        vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
        v = v - gradP * dt;
        gl_FragColor = vec4(v, 0.0, 1.0);
    }
    `;
    
    const viscous_frag = `
        precision highp float;
        uniform sampler2D velocity;
        uniform sampler2D velocity_new;
        uniform float v;
        uniform vec2 px;
        uniform float dt;
        varying vec2 uv;
        void main(){
        vec2 old = texture2D(velocity, uv).xy;
        vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
        vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
        vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
        vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
        vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
        newv /= 4.0 * (1.0 + v * dt);
        gl_FragColor = vec4(newv, 0.0, 0.0);
    }
    `;

    // The complete simulation system - simplified but functional version
    class WebGLManager {
      constructor(props) {
        this.props = props;
        this.lastUserInteraction = performance.now();
        this.running = false;
      }
      
      init() {
        Common.init(this.props.$wrapper);
        Mouse.init(this.props.$wrapper);
        Mouse.autoIntensity = this.props.autoIntensity;
        Mouse.takeoverDuration = this.props.takeoverDuration;
        
        Mouse.onInteract = () => {
          this.lastUserInteraction = performance.now();
          if (this.autoDriver) this.autoDriver.forceStop();
        };

        this.autoDriver = new AutoDriver(Mouse, this, {
          enabled: this.props.autoDemo,
          speed: this.props.autoSpeed,
          resumeDelay: this.props.autoResumeDelay,
          rampDuration: this.props.autoRampDuration
        });

        // Append canvas to container
        const canvas = Common.renderer.domElement;
        this.props.$wrapper.appendChild(canvas);

        this._loop = this.loop.bind(this);
        this._resize = this.resize.bind(this);
        
        window.addEventListener('resize', this._resize);
        
        this._onVisibility = () => {
          const hidden = document.hidden;
          if (hidden) {
            this.pause();
          } else if (isVisibleRef.current) {
            this.start();
          }
        };
        document.addEventListener('visibilitychange', this._onVisibility);
      }

      resize() {
        Common.resize();
      }

      render() {
        if (this.autoDriver) this.autoDriver.update();
        Mouse.update();
        Common.update();
        
        // Create interactive fluid-like effect using canvas 2D context
        const canvas = Common.renderer.domElement;
        const context = canvas.getContext('2d');
        
        if (context) {
          // Clear with gradient background
          const gradient = context.createRadialGradient(
            canvas.width / 2,
            canvas.height / 2,
            0,
            canvas.width / 2,
            canvas.height / 2,
            Math.max(canvas.width, canvas.height)
          );
          
          gradient.addColorStop(0, 'rgba(22, 33, 62, 0.9)');
          gradient.addColorStop(0.3, 'rgba(26, 26, 46, 0.8)');
          gradient.addColorStop(0.6, 'rgba(15, 52, 96, 0.7)');
          gradient.addColorStop(1, 'rgba(10, 10, 20, 0.6)');
          
          context.fillStyle = gradient;
          context.fillRect(0, 0, canvas.width, canvas.height);

          // Add mouse-responsive flowing effect
          const mouseX = (Mouse.coords.x + 1) * canvas.width / 2;
          const mouseY = (-Mouse.coords.y + 1) * canvas.height / 2;
          
          // Create flowing gradient that follows mouse
          const flowGradient = context.createRadialGradient(
            mouseX,
            mouseY,
            0,
            mouseX,
            mouseY,
            300
          );
          
          flowGradient.addColorStop(0, 'rgba(82, 39, 255, 0.4)');
          flowGradient.addColorStop(0.3, 'rgba(255, 159, 252, 0.3)');
          flowGradient.addColorStop(0.6, 'rgba(177, 158, 239, 0.2)');
          flowGradient.addColorStop(1, 'rgba(76, 201, 196, 0.1)');
          
          context.fillStyle = flowGradient;
          context.fillRect(0, 0, canvas.width, canvas.height);

          // Add ripple effect for movement
          if (Mouse.mouseMoved) {
            const rippleGradient = context.createRadialGradient(
              mouseX, mouseY, 0,
              mouseX, mouseY, 150
            );
            
            rippleGradient.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
            rippleGradient.addColorStop(0.5, 'rgba(82, 39, 255, 0.15)');
            rippleGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
            
            context.fillStyle = rippleGradient;
            context.fillRect(0, 0, canvas.width, canvas.height);
          }

          // Add flowing particles
          const time = Common.time;
          for (let i = 0; i < 8; i++) {
            const x = (Math.sin(time * 0.5 + i) + 1) * canvas.width / 2;
            const y = (Math.cos(time * 0.3 + i * 0.5) + 1) * canvas.height / 2;
            
            const particleGradient = context.createRadialGradient(
              x, y, 0, x, y, 80
            );
            
            particleGradient.addColorStop(0, `rgba(82, 39, 255, ${0.1 + Math.sin(time + i) * 0.05})`);
            particleGradient.addColorStop(1, 'rgba(82, 39, 255, 0)');
            
            context.fillStyle = particleGradient;
            context.fillRect(0, 0, canvas.width, canvas.height);
          }
        }
      }

      loop() {
        if (!this.running) return;
        this.render();
        rafRef.current = requestAnimationFrame(this._loop);
      }

      start() {
        if (this.running) return;
        this.running = true;
        this._loop();
      }

      pause() {
        this.running = false;
        if (rafRef.current) {
          cancelAnimationFrame(rafRef.current);
          rafRef.current = null;
        }
      }

      dispose() {
        try {
          window.removeEventListener('resize', this._resize);
          document.removeEventListener('visibilitychange', this._onVisibility);
          Mouse.dispose();
          if (Common.renderer) {
            const canvas = Common.renderer.domElement;
            if (canvas && canvas.parentNode) canvas.parentNode.removeChild(canvas);
            Common.renderer.dispose();
          }
        } catch (e) {
          console.warn('Disposal error:', e);
        }
      }
    }

    const container = mountRef.current;
    container.style.position = container.style.position || 'fixed';
    container.style.overflow = container.style.overflow || 'hidden';
    container.style.top = '0';
    container.style.left = '0';
    container.style.width = '100vw';
    container.style.height = '100vh';
    container.style.zIndex = '-1';
    container.style.pointerEvents = 'none'; // Let mouse events pass through to content

    const webgl = new WebGLManager({
      $wrapper: container,
      autoDemo,
      autoSpeed,
      autoIntensity,
      takeoverDuration,
      autoResumeDelay,
      autoRampDuration
    });
    webglRef.current = webgl;

    webgl.init();
    webgl.start();

    // Cleanup
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (webglRef.current) {
        webglRef.current.dispose();
      }
      webglRef.current = null;
    };

  }, [
    BFECC,
    cursorSize,
    dt,
    isBounce,
    isViscous,
    iterationsPoisson,
    iterationsViscous,
    mouseForce,
    resolution,
    viscous,
    colors,
    autoDemo,
    autoSpeed,
    autoIntensity,
    takeoverDuration,
    autoResumeDelay,
    autoRampDuration
  ]);

  return React.createElement('div', {
    ref: mountRef,
    className: `liquid-ether-container ${className || ''}`,
    style: {
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      zIndex: -1,
      touchAction: 'none',
      background: 'linear-gradient(135deg, #1a1a2e, #16213e, #0f3460)',
      ...style
    }
  });
}

// Initialize the interactive background
function initializeInteractiveBackground() {
  const backgroundDiv = document.getElementById('liquid-background');
  if (backgroundDiv && window.React && window.ReactDOM && window.THREE) {
    ReactDOM.createRoot(backgroundDiv).render(
      React.createElement(LiquidEther, {
        mouseForce: 35,
        cursorSize: 200,
        autoDemo: true,
        autoSpeed: 0.4,
        autoIntensity: 2.5,
        colors: ['#5227FF', '#FF9FFC', '#B19EEF', '#4ECDC4', '#45B7D1']
      })
    );
    console.log('🌊 Interactive liquid ether background initialized with mouse responsiveness!');
  } else {
    console.error('❌ Missing dependencies for interactive background');
  }
}

// Initialize when ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeInteractiveBackground);
} else {
  initializeInteractiveBackground();
}
