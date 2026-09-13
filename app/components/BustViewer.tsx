"use client";

import { Canvas } from "@react-three/fiber";
import {
    ContactShadows,
    Environment,
    Lightformer,
    OrbitControls,
} from "@react-three/drei";
import { Suspense } from "react";
import { MarbleBust } from "./MarbleBust";

function LoadingSculpture() {
    return (
        <mesh>
            <octahedronGeometry args={[1.15, 2]} />
            <meshStandardMaterial color="white" roughness={0.9} />
        </mesh>
    );
}

export default function BustViewer() {
    return (
        <Canvas
            aria-label="Interactive marble bust"
            dpr={[1, 1.7]}
            shadows
            camera={{ position: [0, 0.1, 6.1], fov: 33 }}
            gl={{ antialias: true, alpha: true }}
        >
            <ambientLight intensity={1.35} />

            <directionalLight
                position={[-4, 6, 5]}
                intensity={3.1}
                castShadow
            />

            <directionalLight
                position={[5, 0, -2]}
                intensity={1.15}
            />

            <Environment resolution={64}>
                <Lightformer
                    intensity={2.4}
                    position={[0, 5, 2]}
                    scale={[10, 4, 1]}
                />

                <Lightformer
                    intensity={1.4}
                    position={[-5, 0, 1]}
                    rotation-y={Math.PI / 2}
                    scale={[8, 3, 1]}
                />
            </Environment>

            <Suspense fallback={<LoadingSculpture />}>
                <MarbleBust />
            </Suspense>

            <ContactShadows
                position={[0, -1.92, 0]}
                opacity={0.28}
                scale={5}
                blur={2.2}
                far={4}
            />

            <OrbitControls
                makeDefault
                enableDamping
                dampingFactor={0.06}
                enablePan={false}
                minDistance={4.4}
                maxDistance={7.2}
                minPolarAngle={Math.PI * 0.31}
                maxPolarAngle={Math.PI * 0.69}
                autoRotate
                autoRotateSpeed={0.38}
            />
        </Canvas>
    );
}