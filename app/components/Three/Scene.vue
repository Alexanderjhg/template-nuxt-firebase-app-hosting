<!--
  app/components/Three/Scene.vue
  Componente de Three.js: cubo 3D rotatorio con iluminación y efecto de pulso.
  - Usa onMounted para inicializar el renderer solo en el cliente.
  - Usa onUnmounted para destruir el renderer y evitar fugas de memoria.
  - Responsive: escucha el resize de la ventana y ajusta la cámara/renderer.
-->
<template>
  <div ref="containerRef" class="three-container">
    <canvas ref="canvasRef" class="three-canvas" />

    <!-- Badge de overlay -->
    <div class="three-badge">
      <span class="badge-dot" />
      Three.js · WebGL
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  Scene,
  PerspectiveCamera,
  WebGLRenderer,
  BoxGeometry,
  MeshStandardMaterial,
  Mesh,
  AmbientLight,
  DirectionalLight,
  PointLight,
  Color,
  Clock,
  type WebGLRendererParameters,
} from "three";

// ── Props ─────────────────────────────────────────────────────────────────────
interface Props {
  /** Color del cubo (hex) */
  cubeColor?: string;
  /** Color de fondo de la escena */
  bgColor?: string;
}

const props = withDefaults(defineProps<Props>(), {
  cubeColor: "#6d28d9",
  bgColor: "#0a0a0f",
});

// ── Refs del DOM ──────────────────────────────────────────────────────────────
const containerRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

// ── Variables de Three.js (fuera del estado reactivo → mejor rendimiento) ────
let renderer: WebGLRenderer | null = null;
let animationFrameId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
const clock = new Clock();

onMounted(() => {
  if (!canvasRef.value || !containerRef.value) return;

  const container = containerRef.value;
  const canvas = canvasRef.value;
  const width = container.clientWidth;
  const height = container.clientHeight;

  // ── Escena ─────────────────────────────────────────────────────────────────
  const scene = new Scene();
  scene.background = new Color(props.bgColor);

  // ── Cámara ─────────────────────────────────────────────────────────────────
  const camera = new PerspectiveCamera(45, width / height, 0.1, 100);
  camera.position.set(0, 0, 4);

  // ── Renderer ───────────────────────────────────────────────────────────────
  const rendererParams: WebGLRendererParameters = {
    canvas,
    antialias: true,
    alpha: false,
  };

  renderer = new WebGLRenderer(rendererParams);
  renderer.setSize(width, height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;

  // ── Geometría: cubo con bordes redondeados (BoxGeometry subdivide bien) ────
  const geometry = new BoxGeometry(1.5, 1.5, 1.5);
  const material = new MeshStandardMaterial({
    color: new Color(props.cubeColor),
    metalness: 0.6,
    roughness: 0.2,
  });

  const cube = new Mesh(geometry, material);
  cube.castShadow = true;
  scene.add(cube);

  // ── Iluminación ────────────────────────────────────────────────────────────
  // Luz ambiental suave
  const ambientLight = new AmbientLight(0xffffff, 0.4);
  scene.add(ambientLight);

  // Luz direccional principal
  const dirLight = new DirectionalLight(0xffffff, 1.2);
  dirLight.position.set(5, 5, 5);
  dirLight.castShadow = true;
  scene.add(dirLight);

  // Luz de acento (violeta)
  const accentLight = new PointLight(0x7c3aed, 2, 10);
  accentLight.position.set(-3, 2, 2);
  scene.add(accentLight);

  // Segundo acento (índigo)
  const accentLight2 = new PointLight(0x4f46e5, 1.5, 10);
  accentLight2.position.set(3, -2, -2);
  scene.add(accentLight2);

  // ── Loop de animación ──────────────────────────────────────────────────────
  function animate() {
    animationFrameId = requestAnimationFrame(animate);

    const elapsed = clock.getElapsedTime();

    // Rotación suave
    cube.rotation.x = elapsed * 0.4;
    cube.rotation.y = elapsed * 0.6;

    // Efecto de respiración (pulse en scale)
    const pulse = 1 + Math.sin(elapsed * 1.5) * 0.04;
    cube.scale.setScalar(pulse);

    // Órbita de la luz de acento
    accentLight.position.x = Math.sin(elapsed * 0.8) * 3;
    accentLight.position.z = Math.cos(elapsed * 0.8) * 3;

    renderer!.render(scene, camera);
  }

  animate();

  // ── ResizeObserver: actualiza cámara y renderer al cambiar el tamaño ──────
  resizeObserver = new ResizeObserver((entries) => {
    for (const entry of entries) {
      const { width: w, height: h } = entry.contentRect;
      if (w === 0 || h === 0) return;

      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer?.setSize(w, h);
      renderer?.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    }
  });

  resizeObserver.observe(container);
});

// ── Cleanup: destruir el renderer para evitar fugas de memoria ────────────────
onUnmounted(() => {
  // Cancelar el loop de animación
  if (animationFrameId !== null) {
    cancelAnimationFrame(animationFrameId);
    animationFrameId = null;
  }

  // Desconectar el observer de tamaño
  resizeObserver?.disconnect();
  resizeObserver = null;

  // Liberar la GPU: destruir el contexto WebGL
  renderer?.dispose();
  renderer = null;
});
</script>

<style scoped>
.three-container {
  @apply relative w-full h-full min-h-[400px] rounded-2xl overflow-hidden;
  @apply border border-white/8;
}

.three-canvas {
  @apply w-full h-full block;
}

/* Badge de overlay ─────────────────────────────────────────────────────────── */
.three-badge {
  @apply absolute bottom-4 left-4;
  @apply flex items-center gap-2;
  @apply bg-black/40 backdrop-blur-sm border border-white/10;
  @apply text-xs text-white/50 rounded-full px-3 py-1;
}

.badge-dot {
  @apply w-1.5 h-1.5 rounded-full bg-violet-400;
  animation: badge-pulse 2s ease-in-out infinite;
}

@keyframes badge-pulse {
  0%, 100% { opacity: 1; transform: scale(1); }
  50%       { opacity: 0.5; transform: scale(0.85); }
}
</style>
