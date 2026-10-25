import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';

interface PitchCanvas3DProps {
  lengthMeters?: number;
  widthMeters?: number;
  format?: string;
  className?: string;
}

export const PitchCanvas3D: React.FC<PitchCanvas3DProps> = ({
  lengthMeters = 105,
  widthMeters = 68,
  format = '11-a-side',
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hasWebGL, setHasWebGL] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

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

    const width = container.clientWidth || 600;
    const height = Math.min(360, Math.max(260, Math.round(width * 0.55)));

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(38, width / height, 0.1, 100);
    // Perspective stadium camera angle
    camera.position.set(0, -9, 8.5);
    camera.lookAt(0, 0, 0);

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

    // 2. Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.85);
    scene.add(ambientLight);

    const floodlightLeft = new THREE.DirectionalLight(0xffffff, 2.0);
    floodlightLeft.position.set(-8, -6, 10);
    scene.add(floodlightLeft);

    const floodlightRight = new THREE.DirectionalLight(0xffffff, 1.8);
    floodlightRight.position.set(8, 6, 10);
    scene.add(floodlightRight);

    const crimsonAccent = new THREE.PointLight(0xf02d50, 2.5, 15);
    crimsonAccent.position.set(0, -4, 4);
    scene.add(crimsonAccent);

    // 3. Pitch Geometry Construction
    const pitchGroup = new THREE.Group();
    scene.add(pitchGroup);

    // Scale proportional to length vs width (normalized around 9 units length)
    const pitchLength = 8.5;
    const ratio = Math.max(0.45, Math.min(0.85, widthMeters / (lengthMeters || 105)));
    const pitchWidth = pitchLength * ratio;

    // Turf base
    const turfGeo = new THREE.PlaneGeometry(pitchLength + 0.8, pitchWidth + 0.8, 1, 1);
    const turfMat = new THREE.MeshStandardMaterial({
      color: 0x121417,
      roughness: 0.8,
      metalness: 0.1,
    });
    const turfMesh = new THREE.Mesh(turfGeo, turfMat);
    pitchGroup.add(turfMesh);

    // Mower Stripes (Mow lines)
    const numStripes = 8;
    const stripeWidth = pitchLength / numStripes;
    for (let i = 0; i < numStripes; i++) {
      if (i % 2 === 0) {
        const stripeGeo = new THREE.PlaneGeometry(stripeWidth, pitchWidth);
        const stripeMat = new THREE.MeshStandardMaterial({
          color: 0x16191e,
          roughness: 0.75,
          metalness: 0.1,
        });
        const stripeMesh = new THREE.Mesh(stripeGeo, stripeMat);
        stripeMesh.position.set(-pitchLength / 2 + (i + 0.5) * stripeWidth, 0, 0.005);
        pitchGroup.add(stripeMesh);
      }
    }

    // Touchlines & Lines helper
    const lineMat = new THREE.LineBasicMaterial({
      color: 0xe8e2df,
      linewidth: 1.5,
    });

    // Touchlines perimeter
    const perimeterPoints = [
      new THREE.Vector3(-pitchLength / 2, -pitchWidth / 2, 0.01),
      new THREE.Vector3(pitchLength / 2, -pitchWidth / 2, 0.01),
      new THREE.Vector3(pitchLength / 2, pitchWidth / 2, 0.01),
      new THREE.Vector3(-pitchLength / 2, pitchWidth / 2, 0.01),
      new THREE.Vector3(-pitchLength / 2, -pitchWidth / 2, 0.01),
    ];
    const perimeterGeo = new THREE.BufferGeometry().setFromPoints(perimeterPoints);
    const perimeterLine = new THREE.Line(perimeterGeo, lineMat);
    pitchGroup.add(perimeterLine);

    // Halfway Line
    const centerLinePoints = [
      new THREE.Vector3(0, -pitchWidth / 2, 0.01),
      new THREE.Vector3(0, pitchWidth / 2, 0.01),
    ];
    const centerLineGeo = new THREE.BufferGeometry().setFromPoints(centerLinePoints);
    const centerLine = new THREE.Line(centerLineGeo, lineMat);
    pitchGroup.add(centerLine);

    // Center Circle
    const circleRadius = pitchWidth * 0.18;
    const circlePoints: THREE.Vector3[] = [];
    const segments = 40;
    for (let i = 0; i <= segments; i++) {
      const theta = (i / segments) * Math.PI * 2;
      circlePoints.push(new THREE.Vector3(Math.cos(theta) * circleRadius, Math.sin(theta) * circleRadius, 0.01));
    }
    const circleGeo = new THREE.BufferGeometry().setFromPoints(circlePoints);
    const circleLine = new THREE.Line(circleGeo, lineMat);
    pitchGroup.add(circleLine);

    // Penalty Areas
    const isSmallSided = format.includes('5') || format.includes('6');
    const boxDepth = pitchLength * (isSmallSided ? 0.14 : 0.16);
    const boxWidth = pitchWidth * (isSmallSided ? 0.42 : 0.48);

    // Left Penalty Box
    const leftBoxPoints = [
      new THREE.Vector3(-pitchLength / 2, -boxWidth / 2, 0.01),
      new THREE.Vector3(-pitchLength / 2 + boxDepth, -boxWidth / 2, 0.01),
      new THREE.Vector3(-pitchLength / 2 + boxDepth, boxWidth / 2, 0.01),
      new THREE.Vector3(-pitchLength / 2, boxWidth / 2, 0.01),
    ];
    const leftBoxGeo = new THREE.BufferGeometry().setFromPoints(leftBoxPoints);
    pitchGroup.add(new THREE.Line(leftBoxGeo, lineMat));

    // Right Penalty Box
    const rightBoxPoints = [
      new THREE.Vector3(pitchLength / 2, -boxWidth / 2, 0.01),
      new THREE.Vector3(pitchLength / 2 - boxDepth, -boxWidth / 2, 0.01),
      new THREE.Vector3(pitchLength / 2 - boxDepth, boxWidth / 2, 0.01),
      new THREE.Vector3(pitchLength / 2, boxWidth / 2, 0.01),
    ];
    const rightBoxGeo = new THREE.BufferGeometry().setFromPoints(rightBoxPoints);
    pitchGroup.add(new THREE.Line(rightBoxGeo, lineMat));

    // 4. Physical 3D Goal Structures (Left and Right)
    const postMat = new THREE.MeshStandardMaterial({
      color: 0xf0e9e7,
      roughness: 0.3,
      metalness: 0.8,
    });
    const netMat = new THREE.MeshStandardMaterial({
      color: 0x40404a,
      wireframe: true,
      roughness: 0.9,
    });

    const createGoal = (isLeft: boolean) => {
      const goal = new THREE.Group();
      const goalWidth = pitchWidth * 0.22;
      const goalHeight = 0.55;
      const goalDepth = 0.45;
      const postRadius = 0.025;

      // Vertical posts
      const postGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalHeight);
      postGeo.rotateX(Math.PI / 2);

      const topPost = new THREE.Mesh(postGeo, postMat);
      topPost.position.set(0, -goalWidth / 2, goalHeight / 2);
      topPost.rotation.x = Math.PI / 2;
      goal.add(topPost);

      const bottomPost = new THREE.Mesh(postGeo, postMat);
      bottomPost.position.set(0, goalWidth / 2, goalHeight / 2);
      bottomPost.rotation.x = Math.PI / 2;
      goal.add(bottomPost);

      // Horizontal Crossbar
      const crossbarGeo = new THREE.CylinderGeometry(postRadius, postRadius, goalWidth);
      const crossbar = new THREE.Mesh(crossbarGeo, postMat);
      crossbar.position.set(0, 0, goalHeight);
      goal.add(crossbar);

      // Goal net box
      const netGeo = new THREE.BoxGeometry(goalDepth, goalWidth, goalHeight);
      const netMesh = new THREE.Mesh(netGeo, netMat);
      netMesh.position.set(isLeft ? -goalDepth / 2 : goalDepth / 2, 0, goalHeight / 2);
      goal.add(netMesh);

      goal.position.x = isLeft ? -pitchLength / 2 : pitchLength / 2;
      return goal;
    };

    pitchGroup.add(createGoal(true));
    pitchGroup.add(createGoal(false));

    // 5. Interactive Orbit & Tilt
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let rotX = -0.32;
    let rotZ = 0.12;

    pitchGroup.rotation.x = rotX;
    pitchGroup.rotation.z = rotZ;

    const handlePointerDown = (e: PointerEvent) => {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    };

    const handlePointerMove = (e: PointerEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - prevMouseX;
      const dy = e.clientY - prevMouseY;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;

      rotZ += dx * 0.008;
      rotX += dy * 0.008;
      rotX = Math.max(-0.6, Math.min(-0.15, rotX));

      pitchGroup.rotation.x = rotX;
      pitchGroup.rotation.z = rotZ;
    };

    const handlePointerUp = () => {
      isDragging = false;
    };

    container.addEventListener('pointerdown', handlePointerDown);
    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);

    // 6. Animation Loop
    let animId: number;
    let clock = new THREE.Clock();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      const elapsedTime = clock.getElapsedTime();

      // Subtle atmospheric lighting drift
      crimsonAccent.position.x = Math.sin(elapsedTime * 0.8) * 4;

      if (!isDragging) {
        // Slow organic breath drift
        pitchGroup.rotation.z = rotZ + Math.sin(elapsedTime * 0.6) * 0.04;
      }

      renderer.render(scene, camera);
    };

    animate();

    // 7. Cleanup
    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
      if (container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
      renderer.dispose();
      turfGeo.dispose();
      turfMat.dispose();
      lineMat.dispose();
      perimeterGeo.dispose();
      centerLineGeo.dispose();
      circleGeo.dispose();
      leftBoxGeo.dispose();
      rightBoxGeo.dispose();
    };
  }, [lengthMeters, widthMeters, format]);

  if (!hasWebGL) {
    return (
      <div className="w-full h-64 rounded-xl bg-[#141418] border border-white/10 flex items-center justify-center text-xs text-[#A5A1A4] font-mono">
        3D Stadium View unavailable on this device. Use technical plan.
      </div>
    );
  }

  return (
    <div className={`relative w-full overflow-hidden rounded-xl bg-gradient-to-b from-[#141419] to-[#0c0c0e] border border-white/10 cursor-grab active:cursor-grabbing ${className}`}>
      <div ref={containerRef} className="w-full h-[320px] flex items-center justify-center" />
      <div className="absolute bottom-2.5 right-3 px-2 py-1 rounded bg-[#101013]/80 border border-white/10 text-[10px] font-mono text-[#A5A1A4] pointer-events-none">
        Drag to rotate 3D view
      </div>
    </div>
  );
};
