import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { FXAAShader } from 'three/examples/jsm/shaders/FXAAShader.js';
import { GRAPHICS_PRESETS } from './GameConfig';
import { Logger } from '../utils/Logger';

const CinematicHorrorShader = {
  uniforms: {
    tDiffuse: { value: null },
    uTime: { value: 0.0 },
    uGrainIntensity: { value: 0.018 },
    uVignetteDarkness: { value: 0.42 }
  },
  vertexShader: /* glsl */ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */ `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uGrainIntensity;
    uniform float uVignetteDarkness;
    varying vec2 vUv;

    float hash12(vec2 p) {
      vec3 p3  = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
      vec4 texel = texture2D(tDiffuse, vUv);
      vec3 col = texel.rgb;

      // Subtle shadow lift & clinical cool-blue shadow tint + crisp midtone contrast
      float luma = dot(col, vec3(0.2126, 0.7152, 0.0722));
      vec3 shadowTint = vec3(0.012, 0.018, 0.025);
      col = mix(col + shadowTint * (1.0 - smoothstep(0.0, 0.25, luma)), col, 0.65);
      col = pow(max(col, vec3(0.0)), vec3(0.95));

      // Restrained radial vignette
      vec2 centered = vUv - 0.5;
      float distSq = dot(centered, centered);
      float vig = clamp(1.0 - distSq * uVignetteDarkness * 1.65, 0.45, 1.0);
      col *= vig;

      // Sub-pixel animated film grain (very low intensity)
      float noise = (hash12(gl_FragCoord.xy + fract(uTime * 17.3) * 100.0) - 0.5) * uGrainIntensity;
      col = clamp(col + vec3(noise), 0.0, 1.0);

      gl_FragColor = vec4(col, texel.a);
    }
  `
};

export class SceneManager {
  public readonly scene: THREE.Scene;
  private renderer: THREE.WebGLRenderer | null = null;
  private composer: EffectComposer | null = null;
  private renderPass: RenderPass | null = null;
  private bloomPass: UnrealBloomPass | null = null;
  private fxaaPass: ShaderPass | null = null;
  private gradePass: ShaderPass | null = null;
  private container: HTMLElement | null = null;
  private currentQuality: 'low' | 'medium' | 'high' = 'medium';
  private effectivePixelRatio = 1.0;
  private resizeHandler: (() => void) | null = null;
  private elapsed = 0;

  constructor() {
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x070b10);
    this.scene.fog = new THREE.FogExp2(0x070b10, GRAPHICS_PRESETS.medium.fogDensity);
  }

  initialize(container: HTMLElement, quality: 'low' | 'medium' | 'high' = 'medium'): boolean {
    this.container = container;
    this.currentQuality = quality;
    const preset = GRAPHICS_PRESETS[quality];

    const isJsdom = typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent);
    if (isJsdom) {
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.id = 'game-canvas';
      fallbackCanvas.width = 1280;
      fallbackCanvas.height = 720;
      container.innerHTML = '';
      container.appendChild(fallbackCanvas);
      return true;
    }

    try {
      this.renderer = new THREE.WebGLRenderer({
        antialias: true,
        powerPreference: 'high-performance',
        stencil: false,
        depth: true
      });

      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.25;
      this.renderer.shadowMap.enabled = preset.shadowsEnabled;
      this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

      const width = Math.max(1, container.clientWidth || window.innerWidth || 1280);
      const height = Math.max(1, container.clientHeight || window.innerHeight || 720);

      this.effectivePixelRatio =
        Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax) * preset.renderScale;

      this.renderer.setPixelRatio(this.effectivePixelRatio);
      this.renderer.setSize(width, height, true);

      container.innerHTML = '';
      this.renderer.domElement.id = 'game-canvas';
      container.appendChild(this.renderer.domElement);

      this.setupPostProcessing(width, height, preset.msaaSamples);
      this.applyQualityPreset(quality);

      this.resizeHandler = () => this.onWindowResize();
      window.addEventListener('resize', this.resizeHandler);
      return true;
    } catch (err) {
      Logger.warn('SceneManager', `WebGLRenderer fallback activated: ${(err as Error).message}`);
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.id = 'game-canvas';
      fallbackCanvas.width = container.clientWidth || 1280;
      fallbackCanvas.height = container.clientHeight || 720;
      container.innerHTML = '';
      container.appendChild(fallbackCanvas);
      return true;
    }
  }

  private setupPostProcessing(width: number, height: number, samples: number): void {
    if (!this.renderer) return;
    try {
      const gl = this.renderer.getContext();
      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      const rendererStr = String(
        (debugInfo && gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL)) ||
          gl.getParameter(gl.RENDERER) ||
          ''
      );
      if (/swiftshader|llvmpipe|software|basic render/i.test(rendererStr)) {
        this.composer = null;
        return;
      }

      const isWebGL2 = this.renderer.capabilities.isWebGL2;
      const renderTarget = new THREE.WebGLRenderTarget(
        Math.max(1, Math.floor(width * this.effectivePixelRatio)),
        Math.max(1, Math.floor(height * this.effectivePixelRatio)),
        {
          type: THREE.HalfFloatType,
          format: THREE.RGBAFormat,
          colorSpace: THREE.SRGBColorSpace,
          samples: isWebGL2 ? samples : 0
        }
      );

      this.composer = new EffectComposer(this.renderer, renderTarget);
      this.composer.setPixelRatio(this.effectivePixelRatio);
      this.composer.setSize(width, height);

      // RenderPass is attached dynamically with the active camera in render()
      this.bloomPass = new UnrealBloomPass(
        new THREE.Vector2(width, height),
        0.22, // Subtle bloom strength for emissive light fixtures only
        0.35, // Radius
        0.88  // High threshold so normal surfaces never bloom
      );

      this.fxaaPass = new ShaderPass(FXAAShader);
      this.updateFxaaUniforms(width, height);

      this.gradePass = new ShaderPass(CinematicHorrorShader);
      const outputPass = new OutputPass();

      this.composer.addPass(this.bloomPass);
      this.composer.addPass(this.gradePass);
      this.composer.addPass(this.fxaaPass);
      this.composer.addPass(outputPass);
    } catch (err) {
      Logger.warn('SceneManager', `Post-processing fallback to direct rendering: ${(err as Error).message}`);
      this.composer = null;
    }
  }

  private updateFxaaUniforms(width: number, height: number): void {
    if (!this.fxaaPass) return;
    const pixelWidth = Math.max(1, width * this.effectivePixelRatio);
    const pixelHeight = Math.max(1, height * this.effectivePixelRatio);
    if (this.fxaaPass.material.uniforms['resolution']) {
      this.fxaaPass.material.uniforms['resolution'].value.set(1 / pixelWidth, 1 / pixelHeight);
    }
  }

  applyQualityPreset(quality: 'low' | 'medium' | 'high'): void {
    this.currentQuality = quality;
    const preset = GRAPHICS_PRESETS[quality];
    this.scene.fog = new THREE.FogExp2(0x070b10, preset.fogDensity);

    if (this.renderer && this.container) {
      const width = Math.max(1, this.container.clientWidth || window.innerWidth || 1280);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight || 720);

      this.effectivePixelRatio =
        Math.min(window.devicePixelRatio || 1, preset.pixelRatioMax) * preset.renderScale;

      this.renderer.setPixelRatio(this.effectivePixelRatio);
      this.renderer.setSize(width, height, true);
      this.renderer.shadowMap.enabled = preset.shadowsEnabled;

      if (this.composer) {
        this.composer.setPixelRatio(this.effectivePixelRatio);
        this.composer.setSize(width, height);
      }
      if (this.bloomPass) {
        this.bloomPass.enabled = preset.bloomEnabled;
      }
      if (this.fxaaPass) {
        this.fxaaPass.enabled = preset.fxaaEnabled;
        this.updateFxaaUniforms(width, height);
      }
    }
  }

  onWindowResize(): void {
    if (!this.container || !this.renderer) return;
    const width = Math.max(1, this.container.clientWidth || window.innerWidth || 1280);
    const height = Math.max(1, this.container.clientHeight || window.innerHeight || 720);
    this.renderer.setSize(width, height, true);
    if (this.composer) {
      this.composer.setSize(width, height);
    }
    this.updateFxaaUniforms(width, height);
  }

  render(camera: THREE.PerspectiveCamera, dt = 0.016): void {
    if (!this.renderer) return;
    this.elapsed += dt;

    if (this.container) {
      const width = Math.max(1, this.container.clientWidth || window.innerWidth || 1280);
      const height = Math.max(1, this.container.clientHeight || window.innerHeight || 720);
      const aspect = width / height;
      if (Math.abs(camera.aspect - aspect) > 0.005) {
        camera.aspect = aspect;
        camera.updateProjectionMatrix();
      }
    }

    if (this.composer) {
      if (!this.renderPass) {
        this.renderPass = new RenderPass(this.scene, camera);
        this.composer.insertPass(this.renderPass, 0);
      } else {
        this.renderPass.camera = camera;
      }

      if (this.gradePass?.uniforms?.['uTime']) {
        this.gradePass.uniforms['uTime'].value = this.elapsed;
      }

      this.composer.render(dt);
    } else {
      this.renderer.render(this.scene, camera);
    }
  }

  getMaxAnisotropy(): number {
    if (!this.renderer) return 4;
    const preset = GRAPHICS_PRESETS[this.currentQuality];
    return Math.min(this.renderer.capabilities.getMaxAnisotropy() || 4, preset.anisotropy);
  }

  getQuality(): 'low' | 'medium' | 'high' {
    return this.currentQuality;
  }

  getEffectivePixelRatio(): number {
    return this.effectivePixelRatio;
  }

  isBloomEnabled(): boolean {
    return Boolean(this.bloomPass?.enabled);
  }

  isFxaaEnabled(): boolean {
    return Boolean(this.fxaaPass?.enabled);
  }

  getOutputColorSpace(): string {
    return this.renderer?.outputColorSpace ?? THREE.SRGBColorSpace;
  }

  getDomElement(): HTMLCanvasElement | null {
    if (this.renderer) return this.renderer.domElement;
    return this.container?.querySelector('canvas') ?? null;
  }

  dispose(): void {
    if (this.resizeHandler) {
      window.removeEventListener('resize', this.resizeHandler);
      this.resizeHandler = null;
    }
    if (this.composer) {
      this.composer.dispose();
      this.composer = null;
    }
    if (this.renderer) {
      this.renderer.dispose();
      this.renderer = null;
    }
  }
}
