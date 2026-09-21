/**
 * CSS 3D Rubik cube viewport.
 * Facelet indices match server URFDLB lattice (rubik/model.py).
 */
(function (global) {
  const SIZE = 52;
  const GAP = 2;
  const STEP = SIZE + GAP;

  /** Facelet index for an outward sticker on cubie (x,y,z) ∈ {-1,0,1}. */
  function faceletIndex(face, x, y, z) {
    if (face === "U") return 3 * (z + 1) + (x + 1);
    if (face === "D") return 27 + 3 * (1 - z) + (x + 1);
    if (face === "F") return 18 + 3 * (1 - y) + (x + 1);
    if (face === "B") return 45 + 3 * (1 - y) + (1 - x);
    if (face === "R") return 9 + 3 * (1 - y) + (1 - z);
    if (face === "L") return 36 + 3 * (1 - y) + (z + 1);
    throw new Error(face);
  }

  function outwardFaces(x, y, z) {
    const faces = [];
    if (y === 1) faces.push("U");
    if (y === -1) faces.push("D");
    if (x === 1) faces.push("R");
    if (x === -1) faces.push("L");
    if (z === 1) faces.push("F");
    if (z === -1) faces.push("B");
    return faces;
  }

  function onLayer(face, x, y, z) {
    if (face === "U") return y === 1;
    if (face === "D") return y === -1;
    if (face === "R") return x === 1;
    if (face === "L") return x === -1;
    if (face === "F") return z === 1;
    if (face === "B") return z === -1;
    return false;
  }

  /** CSS rotation for Singmaster CW (and multiples), matching model.py. */
  function moveTransform(move) {
    const face = move[0];
    let turns = 1;
    if (move.endsWith("2")) turns = 2;
    else if (move.endsWith("'")) turns = -1;
    switch (face) {
      case "U":
        return `rotateY(${-90 * turns}deg)`;
      case "D":
        return `rotateY(${90 * turns}deg)`;
      case "R":
        return `rotateX(${-90 * turns}deg)`;
      case "L":
        return `rotateX(${90 * turns}deg)`;
      case "F":
        return `rotateZ(${-90 * turns}deg)`;
      case "B":
        return `rotateZ(${90 * turns}deg)`;
      default:
        throw new Error(`Unknown move ${move}`);
    }
  }

  function reducedMotion() {
    return (
      typeof matchMedia === "function" &&
      matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  function createCube3D(rootEl) {
    if (!rootEl) throw new Error("createCube3D: root element required");

    rootEl.innerHTML = "";
    rootEl.style.setProperty("--cubie", `${SIZE}px`);

    const scene = document.createElement("div");
    scene.className = "cube-scene";
    const orbit = document.createElement("div");
    orbit.className = "cube-orbit";
    const cubeRoot = document.createElement("div");
    cubeRoot.className = "cube-root";
    orbit.appendChild(cubeRoot);
    scene.appendChild(orbit);
    rootEl.appendChild(scene);

    /** @type {{x:number,y:number,z:number,el:HTMLElement,stickers:HTMLElement[]}[]} */
    const cubies = [];
    /** @type {HTMLElement[]} */
    const stickerEls = new Array(54);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;
          const el = document.createElement("div");
          el.className = "cubie";
          el.style.transform = `translate3d(${x * STEP}px, ${-y * STEP}px, ${z * STEP}px)`;
          const stickers = [];
          for (const face of outwardFaces(x, y, z)) {
            const faceEl = document.createElement("div");
            faceEl.className = `cubie-face face-${face}`;
            const idx = faceletIndex(face, x, y, z);
            faceEl.dataset.faceletIndex = String(idx);
            el.appendChild(faceEl);
            stickers.push(faceEl);
            stickerEls[idx] = faceEl;
          }
          // Plastic core faces (inward / hidden) for thickness
          for (const face of ["U", "D", "R", "L", "F", "B"]) {
            if (outwardFaces(x, y, z).includes(face)) continue;
            const core = document.createElement("div");
            core.className = `cubie-face face-${face}`;
            el.appendChild(core);
          }
          cubeRoot.appendChild(el);
          cubies.push({ x, y, z, el, stickers });
        }
      }
    }

    let facelets =
      "UUUUUUUUURRRRRRRRRFFFFFFFFFDDDDDDDDDLLLLLLLLLBBBBBBBBB";
    let orbitX = -28;
    let orbitY = -38;
    let orbitEnabled = true;
    let turning = false;
    let disposed = false;

    function paint(next) {
      if (!next || next.length !== 54) return;
      facelets = next;
      for (let i = 0; i < 54; i++) {
        const node = stickerEls[i];
        if (!node) continue;
        const phys =
          i < 9 ? "U" : i < 18 ? "R" : i < 27 ? "F" : i < 36 ? "D" : i < 45 ? "L" : "B";
        node.className = `cubie-face face-${phys} sticker-${next[i]}`;
      }
    }

    function applyOrbit() {
      orbit.style.transform = `rotateX(${orbitX}deg) rotateY(${orbitY}deg)`;
    }
    applyOrbit();

    // Pointer orbit
    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e) {
      if (!orbitEnabled || turning) return;
      dragging = true;
      lastX = e.clientX;
      lastY = e.clientY;
      rootEl.setPointerCapture?.(e.pointerId);
    }
    function onPointerMove(e) {
      if (!dragging || !orbitEnabled) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      orbitY += dx * 0.45;
      orbitX -= dy * 0.45;
      orbitX = Math.max(-80, Math.min(80, orbitX));
      applyOrbit();
    }
    function onPointerUp() {
      dragging = false;
    }

    rootEl.addEventListener("pointerdown", onPointerDown);
    rootEl.addEventListener("pointermove", onPointerMove);
    rootEl.addEventListener("pointerup", onPointerUp);
    rootEl.addEventListener("pointercancel", onPointerUp);

    function setFacelets(next) {
      paint(next);
    }

    function animateMove(move) {
      if (disposed) return Promise.resolve();
      if (!move || typeof move !== "string") {
        return Promise.reject(new Error("invalid move"));
      }
      const face = move[0];
      if (!"URFDLB".includes(face)) {
        return Promise.reject(new Error(`invalid move ${move}`));
      }

      if (turning) {
        // Queue-safe: wait until free then run
        return new Promise((resolve, reject) => {
          const wait = () => {
            if (disposed) return resolve();
            if (!turning) {
              animateMove(move).then(resolve, reject);
            } else {
              requestAnimationFrame(wait);
            }
          };
          wait();
        });
      }

      turning = true;
      const layerCubies = cubies.filter((c) => onLayer(face, c.x, c.y, c.z));
      const layer = document.createElement("div");
      layer.className = "turn-layer";
      cubeRoot.appendChild(layer);

      for (const c of layerCubies) {
        layer.appendChild(c.el);
      }

      const transform = moveTransform(move);
      const duration = reducedMotion() ? 10 : 320;
      layer.style.setProperty("--turn-ms", `${duration}ms`);

      return new Promise((resolve) => {
        let done = false;
        const finish = () => {
          if (done) return;
          done = true;
          layer.removeEventListener("transitionend", onEnd);
          // Restore cubies to cubeRoot with identity placement
          for (const c of layerCubies) {
            cubeRoot.appendChild(c.el);
            c.el.style.transform = `translate3d(${c.x * STEP}px, ${-c.y * STEP}px, ${c.z * STEP}px)`;
          }
          layer.remove();
          turning = false;
          resolve();
        };
        const onEnd = (ev) => {
          if (ev.target !== layer || ev.propertyName !== "transform") return;
          finish();
        };
        layer.addEventListener("transitionend", onEnd);

        // Double rAF so the browser registers the initial transform
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            layer.style.transform = transform;
          });
        });

        setTimeout(finish, duration + 80);
      });
    }

    // Initial solved paint
    paint(facelets);

    return {
      setFacelets,
      animateMove,
      setOrbitEnabled(v) {
        orbitEnabled = !!v;
      },
      destroy() {
        disposed = true;
        rootEl.removeEventListener("pointerdown", onPointerDown);
        rootEl.removeEventListener("pointermove", onPointerMove);
        rootEl.removeEventListener("pointerup", onPointerUp);
        rootEl.removeEventListener("pointercancel", onPointerUp);
        rootEl.innerHTML = "";
      },
    };
  }

  global.createCube3D = createCube3D;
})(typeof window !== "undefined" ? window : globalThis);
