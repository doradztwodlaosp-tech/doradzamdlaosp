import React, { useLayoutEffect } from "react";
import * as THREE from "three";
import { useThree } from "@react-three/fiber";
import { MARKA } from "./marka";

// Styl „rysunek techniczny”: przedmioty jako cienkie białe linie na grafitowym tle, złote linie dla akcentów.
// Spokojny, „dokumentacyjny” wygląd – pasuje do usług prawnych bardziej niż kolorowa makieta.
// Działa na każdej scenie three.js: podmienia materiały i dorysowuje krawędzie brył.

export const RYSUNEK = {
  tlo: "#17181D",
  wypelnienie: "#1B1D24",
  linia: "#F2F3F6",
  siatka: "#272A33",
  siatkaGlowna: "#353946",
};

const PROG_KRAWEDZI = 28; // stopnie: mniejsze = więcej linii

const wypelnienie = new THREE.MeshBasicMaterial({
  color: RYSUNEK.wypelnienie,
  polygonOffset: true,
  polygonOffsetFactor: 1,
  polygonOffsetUnits: 1,
});
const liniaBiala = new THREE.LineBasicMaterial({ color: RYSUNEK.linia, transparent: true, opacity: 1 });
const liniaZlota = new THREE.LineBasicMaterial({ color: MARKA.zloto, transparent: true, opacity: 0.95 });

const zlotyKolor = new THREE.Color(MARKA.zloto);
const jestZloty = (m: THREE.Material) => {
  const c = (m as THREE.MeshStandardMaterial).color;
  if (!c) return false;
  const hsl = { h: 0, s: 0, l: 0 };
  c.getHSL(hsl);
  const z = { h: 0, s: 0, l: 0 };
  zlotyKolor.getHSL(z);
  return Math.abs(hsl.h - z.h) < 0.05 && hsl.s > 0.45 && hsl.l > 0.35;
};

const przerob = (mesh: THREE.Mesh) => {
  const ud = mesh.userData as { rysunek?: { oryginal: THREE.Material | THREE.Material[]; zamiana: THREE.Material | THREE.Material[] } };
  const oryginal = ud.rysunek?.oryginal ?? mesh.material;
  // Gdy React podmienił materiał (np. animowany kolor), przeliczamy od nowa
  if (ud.rysunek && mesh.material !== ud.rysunek.zamiana) ud.rysunek = undefined;
  if (ud.rysunek) return;
  const lista = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
  // Kolory i tekstury znikają – zostaje tylko to, co niesie treść (napisy na dokumentach, tabliczce, ekranie)
  const zMapa = !!mesh.userData.tekst && lista.some((m) => (m as THREE.MeshBasicMaterial).map);
  const zloty = !!mesh.userData.zloty || lista.some(jestZloty);
  let zamiana: THREE.Material | THREE.Material[] = wypelnienie;
  if (zMapa) {
    // tekstury z napisami (dokumenty, tabliczka, ekran) zostają czytelne
    zamiana = lista.map((m) => {
      const map = (m as THREE.MeshBasicMaterial).map;
      return map ? new THREE.MeshBasicMaterial({ map, color: "#D8D8DC", toneMapped: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }) : wypelnienie;
    });
    if (!Array.isArray(mesh.material)) zamiana = (zamiana as THREE.Material[])[0];
  }
  mesh.material = zamiana;
  ud.rysunek = { oryginal, zamiana };
  if (!mesh.userData.krawedzie && !(mesh.geometry instanceof THREE.PlaneGeometry && zMapa)) {
    const linie = new THREE.LineSegments(new THREE.EdgesGeometry(mesh.geometry, PROG_KRAWEDZI), zloty ? liniaZlota : liniaBiala);
    linie.raycast = () => {};
    mesh.add(linie);
    mesh.userData.krawedzie = linie;
  }
  mesh.castShadow = false;
};

// Wstaw do sceny three.js: przerabia wszystkie bryły na rysunek (co klatkę, bo React może dokładać nowe)
export const TrybRysunku: React.FC<{ pomin?: (m: THREE.Mesh) => boolean }> = ({ pomin }) => {
  const { scene } = useThree();
  useLayoutEffect(() => {
    scene.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh || m.userData.bezRysunku || pomin?.(m)) return;
      przerob(m);
    });
  });
  return null;
};

// Podłoże: grafit z delikatną siatką kreślarską
export const SiatkaKreslarska: React.FC = () => (
  <group>
    <mesh position={[0, -0.051, 0]} rotation={[-Math.PI / 2, 0, 0]} userData={{ bezRysunku: true }} receiveShadow>
      <planeGeometry args={[200, 200]} />
      <meshBasicMaterial color={RYSUNEK.tlo} />
    </mesh>
    <gridHelper args={[120, 240, RYSUNEK.siatkaGlowna, RYSUNEK.siatka]} position={[0, -0.04, 0]} />
  </group>
);
