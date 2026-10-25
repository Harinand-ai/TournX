import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface TournXEmblemCanvas3DProps {
  size?: number;
  autoRotate?: boolean;
  interactive?: boolean;
  className?: string;
  glowColor?: string;
  rimColor?: string;
  showSpotlight?: boolean;
}

export const TournXEmblemCanvas3D: React.FC<TournXEmblemCanvas3DProps> = ({
  size = 180,
  autoRotate = true,
  interactive = true,
  className = '',
  glowColor = '#D72645',
  rimColor = '#991B35',
  showSpotlight = true,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Check WebGL availability
    try {
      const testCanvas = document.createElement('canvas');
      const gl = testCanvas.getContext('webgl') || testCanvas.getContext('experimental-webgl');
      if (!gl) {
        setHasWebGL(false);
        return;
      }
    } catch {
      setHasWebGL(false);
      return;
    }

    const width = size;
    const height = size;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 100);
    camera.position.set(0, 0, 7.5);

    const renderer = new THREE.WebGLRenderer({
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    container.appendChild(renderer.domElement);

    // 2. Lighting Setup
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.9);
    scene.add(ambientLight);

    const keyLight = new THREE.DirectionalLight(0xffffff, 2.2);
    keyLight.position.set(3, 4, 5);
    scene.add(keyLight);

    const crimsonRimLight = new THREE.PointLight(new THREE.Color(rimColor), 3.5, 12);
    crimsonRimLight.position.set(-3, -2, 3);
    scene.add(crimsonRimLight);

    const topSpecularLight = new THREE.PointLight(0xffffff, 1.8, 8);
    topSpecularLight.position.set(0, 3, 4);
    scene.add(topSpecularLight);

    // 3. 3D Emblem Geometry Construction
    const emblemGroup = new THREE.Group();
    scene.add(emblemGroup);

    // A. Outer Chamfered Shield / Plaque (Backplate)
    const plaqueShape = new THREE.Shape();
    const r = 2.1;
    const chamfer = 0.45;
    plaqueShape.moveTo(-r + chamfer, -r);
    plaqueShape.lineTo(r - chamfer, -r);
    plaqueShape.lineTo(r, -r + chamfer);
    plaqueShape.lineTo(r, r - chamfer);
    plaqueShape.lineTo(r - chamfer, r);
    plaqueShape.lineTo(-r + chamfer, r);
    plaqueShape.lineTo(-r, r - chamfer);
    plaqueShape.lineTo(-r, -r + chamfer);
    plaqueShape.closePath();

    const plaqueExtrudeSettings: THREE.ExtrudeGeometryOptions = {
      depth: 0.35,
      bevelEnabled: true,
      bevelSegments: 4,
      steps: 1,
      bevelSize: 0.12,
      bevelThickness: 0.14,
    };

    const plaqueGeo = new THREE.ExtrudeGeometry(plaqueShape, plaqueExtrudeSettings);
    plaqueGeo.center();

    const plaqueMat = new THREE.MeshStandardMaterial({
      color: 0x141419,
      roughness: 0.35,
      metalness: 0.85,
    });
    const plaqueMesh = new THREE.Mesh(plaqueGeo, plaqueMat);
    emblemGroup.add(plaqueMesh);

    // B. Inner Rim / Crimson Bezel Frame
    const rimShape = new THREE.Shape();
    const rimR = 1.9;
    const rimChamfer = 0.4;
    rimShape.moveTo(-rimR + rimChamfer, -rimR);
    rimShape.lineTo(rimR - rimChamfer, -rimR);
    rimShape.lineTo(rimR, -rimR + rimChamfer);
    rimShape.lineTo(rimR, rimR - rimChamfer);
    rimShape.lineTo(rimR - rimChamfer, rimR);
    rimShape.lineTo(-rimR + rimChamfer, rimR);
    rimShape.lineTo(-rimR, rimR - rimChamfer);
    rimShape.lineTo(-rimR, -rimR + rimChamfer);
    rimShape.closePath();

    const rimGeo = new THREE.ExtrudeGeometry(rimShape, {
      depth: 0.08,
      bevelEnabled: true,
      bevelSegments: 2,
      bevelSize: 0.05,
      bevelThickness: 0.06,
    });
    rimGeo.center();

    const rimMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(rimColor),
      roughness: 0.25,
      metalness: 0.7,
      emissive: new THREE.Color(0x731428),
      emissiveIntensity: 0.4,
    });
    const rimMesh = new THREE.Mesh(rimGeo, rimMat);
    rimMesh.position.z = 0.22;
    emblemGroup.add(rimMesh);

    // C. Core Dark Plate
    const corePlateGeo = new THREE.BoxGeometry(3.3, 3.3, 0.05);
    const corePlateMat = new THREE.MeshStandardMaterial({
      color: 0x0c0c0f,
      roughness: 0.5,
      metalness: 0.6,
    });
    const corePlateMesh = new THREE.Mesh(corePlateGeo, corePlateMat);
    corePlateMesh.position.z = 0.28;
    emblemGroup.add(corePlateMesh);

    // D. Extruded Soft Silver "T" Monogram
    const tShape = new THREE.Shape();
    // T Horizontal Top Bar
    tShape.moveTo(-1.25, 0.95);
    tShape.lineTo(1.25, 0.95);
    tShape.lineTo(1.25, 0.45);
    tShape.lineTo(0.35, 0.45);
    // T Vertical Stem
    tShape.lineTo(0.35, -1.05);
    tShape.lineTo(-0.35, -1.05);
    tShape.lineTo(-0.35, 0.45);
    tShape.lineTo(-1.25, 0.45);
    tShape.closePath();

    const tGeo = new THREE.ExtrudeGeometry(tShape, {
      depth: 0.22,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.04,
      bevelThickness: 0.05,
    });
    tGeo.center();

    const tMat = new THREE.MeshStandardMaterial({
      color: 0xf5eeec,
      roughness: 0.2,
      metalness: 0.92,
    });
    const tMesh = new THREE.Mesh(tGeo, tMat);
    tMesh.position.z = 0.42;
    emblemGroup.add(tMesh);

    // E. Extruded Vivid Crimson "X" Dynamic Slash
    const xShape = new THREE.Shape();
    // Angled slash intersecting the stem
    xShape.moveTo(0.15, 0.55);
    xShape.lineTo(1.15, -0.95);
    xShape.lineTo(0.65, -0.95);
    xShape.lineTo(-0.25, 0.35);
    xShape.closePath();

    const xGeo = new THREE.ExtrudeGeometry(xShape, {
      depth: 0.28,
      bevelEnabled: true,
      bevelSegments: 3,
      bevelSize: 0.04,
      bevelThickness: 0.06,
    });
    xGeo.center();

    const xMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(glowColor),
      roughness: 0.15,
      metalness: 0.65,
      emissive: new THREE.Color(0x991b35),
      emissiveIntensity: 0.5,
    });
    const xMesh = new THREE.Mesh(xGeo, xMat);
    xMesh.position.set(0.35, -0.15, 0.52);
    emblemGroup.add(xMesh);

    // 4. Mouse / Touch Parallax & Rotation
    let targetRotX = 0;
    let targetRotY = 0;
    let isHovering = false;

    const handlePointerMove = (e: PointerEvent) => {
      if (!interactive) return;
      const rect = container.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      targetRotY = x * 0.45;
      targetRotX = -y * 0.35;
      isHovering = true;
    };

    const handlePointerLeave = () => {
      isHovering = false;
      targetRotX = 0;
      targetRotY = 0;
    };

    if (interactive) {
      container.addEventListener('pointermove', handlePointerMove);
      container.addEventListener('pointerleave', handlePointerLeave);
    }

    // 5. Render Loop with Inertia
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      if (autoRotate && !isHovering) {
        // Gentle athletic floating idle oscillation
        emblemGroup.rotation.y = Math.sin(elapsedTime * 1.4) * 0.18;
        emblemGroup.rotation.x = Math.cos(elapsedTime * 1.1) * 0.12;
        emblemGroup.position.y = Math.sin(elapsedTime * 1.8) * 0.08;
      } else {
        // Smooth lerp to pointer
        emblemGroup.rotation.y += (targetRotY - emblemGroup.rotation.y) * 0.08;
        emblemGroup.rotation.x += (targetRotX - emblemGroup.rotation.x) * 0.08;
        emblemGroup.position.y += (0 - emblemGroup.position.y) * 0.08;
      }

      // Dynamic light tracking
      topSpecularLight.position.x = Math.sin(elapsedTime * 2.0) * 2.5;

      renderer.render(scene, camera);
    };

    animate();

    // 6. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      if (interactive) {
        container.removeEventListener('pointermove', handlePointerMove);
        container.removeEventListener('pointerleave', handlePointerLeave);
      }
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      plaqueGeo.dispose();
      plaqueMat.dispose();
      rimGeo.dispose();
      rimMat.dispose();
      corePlateGeo.dispose();
      corePlateMat.dispose();
      tGeo.dispose();
      tMat.dispose();
      xGeo.dispose();
      xMat.dispose();
    };
  }, [size, autoRotate, interactive, glowColor, rimColor]);

  if (!hasWebGL) {
    // Graceful CSS fallback for non-WebGL environments
    return (
      <div
        className={`relative flex items-center justify-center rounded-2xl bg-gradient-to-br from-[#21191D] via-[#19191F] to-[#101013] border border-[#F02D50]/50 shadow-[0_0_30px_rgba(240,45,80,0.3)] ${className}`}
        style={{ width: size, height: size }}
      >
        <span className="font-display font-black text-4xl text-[#F0E9E7] italic">
          T<span className="text-[#F02D50]">X</span>
        </span>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{ width: size, height: size }}
    />
  );
};
