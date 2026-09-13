import { useGLTF } from "@react-three/drei";
import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { SkeletonUtils } from "three-stdlib";

const MODEL_URL = "/models/marble-bust/marble_bust_01_1k.gltf";

export function MarbleBust() {
    const { scene } = useGLTF(MODEL_URL);
    const bust = useMemo(() => {
        const object = SkeletonUtils.clone(scene);
        const bounds = new THREE.Box3().setFromObject(object);
        const size = bounds.getSize(new THREE.Vector3());
        object.scale.setScalar(3.55 / Math.max(size.y, 0.01));

        const scaledBounds = new THREE.Box3().setFromObject(object);
        const center = scaledBounds.getCenter(new THREE.Vector3());
        object.position.set(-center.x, -center.y - 0.08, -center.z);
        return object;
    }, [scene]);

    useEffect(() => {
        bust.traverse((child) => {
            if (child instanceof THREE.Mesh) {
                child.castShadow = true;
                child.receiveShadow = true;
                const materials = Array.isArray(child.material) ? child.material : [child.material];
                materials.forEach((material) => {
                    if (material instanceof THREE.MeshStandardMaterial) {
                        material.color.set("#5e5e5e");
                        material.map = null;
                        material.roughness = 0.78;
                        material.metalness = 0;
                        material.flatShading = true;
                        material.needsUpdate = true;
                    }
                });
            }
        });
    }, [bust]);

    return <primitive object={bust} rotation={[0.02, -0.35, -0.025]} />;
}

useGLTF.preload(MODEL_URL);