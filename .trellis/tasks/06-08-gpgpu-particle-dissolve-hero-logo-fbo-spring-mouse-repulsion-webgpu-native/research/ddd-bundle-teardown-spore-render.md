# DDD 2024 "D" — production-bundle teardown + spore-render research (2026-06-09)

> Output del workflow di ricerca `wf_ae5174b3-cd9` (3 agenti). L'agente "reference" ha
> **decompilato il bundle di produzione del sito DDD** (`hoisted.DFPcBL_D.js`, 876KB, +
> `assets/models/*.buf` da `1105-ddd2024-homepage.lusion.co`) — evidenza di prima mano,
> supera le analisi a occhio in `ParticleDissolve.md` §1/§5/§10.

## 1. Ground truth dal bundle DDD (reverse engineering)

**Stack: three.js WebGL1/2, NON WebGPU.**

### Architettura reale

1. **La lettera è un soft body CPU, non un target di sim particellare.** `SoftBodyTets` =
   sim tetraedrica **XPBD** (`TETS.buf`: 285 vertici, 1074 tet; edgeCompliance=1,
   volCompliance=0) ancorata a spline (`SPLINES.buf`) con richiamo a molla
   `(restLen-len)*dt*80`. Cursore = **sweep a capsula** (proiezione mouse prev→curr,
   raggio 0.1) che inietta `mouseVel * 0.25` nei vertici dei tet. Il momentum/la
   ricomposizione vengono dal soft body; le particelle ci sono "skinnate" sopra.

2. **Spore = particelle GPGPU skinnate al soft body.** `POINTS.buf`: **50.910 particelle
   desktop / 28.775 mobile**; attributi `position, tet, bary, dist` — ogni particella
   memorizza id del tetraedro + pesi baricentrici; un pass `SoftBodyParticles` valuta le
   posizioni "home" skinnate in un FBO. Sim ping-pong pos/vel (~226×226 RGBA float) con
   **state machine di vita**: life ∈ (0,1] = pinnata alla superficie, decade di
   `50*pow(min(1,|v|*0.35),5)` quando la velocità locale del soft body è alta (= trigger
   della dispersione) e si rigenera altrimenti; life ∈ (-1,0] = volo libero,
   `pos += 0.7*v*dt`, velocità ereditata dal tet (clampata) + **curl noise** `curl(pos*4)`,
   damping esponenziale; life ≤ -1 = respawn a casa con life=2; life ∈ (1,2] = countdown
   di ricrescita.

3. **NON sono due layer particellari**: UN solo sistema + attributo per-particella `dist`
   (dist<0.5 = core, non si stacca MAI; dist>0.75 = pelle esterna, flasha ciano in
   ricrescita) + una **mesh interna solida occludente** (`SOLID.buf`, `SoftBodyInner`)
   che fa leggere il guscio come massa packed.

4. **Primitiva di render: GEOMETRIA ISTANZIATA ILLUMINATA, non punti additivi.**
   InstancedBufferGeometry la cui instance geometry è `PARTICLE_LD.buf`: **emisfero
   low-poly da 11 vertici / 10 triangoli** (bbox z: 0..0.525) con normali vere, rivolto
   alla camera. **Lighting per-VERTEX** nel vertex shader: point light fissa, diffuse
   `NdL` con attenuazione dist², specular `reflect(-V,N)`, più **AO + contact shadow +
   indirect diffuse campionati da un light field voxel 64×64×32 dinamico** (3D texture
   sliced-2D, blending temporale) nel quale le stesse particelle vengono splattate ogni
   frame come pass Points con `MaxEquation` blending → è QUESTA self-occlusion volumetrica
   a dare il look "ball-pit" opaco. Fragment = solo tonemap ACES (exposure 1.8/0.6).

5. **Colori (hardcoded)**: albedo viola `vec3(0.44, 0.322, 0.816)` (~#7052D0,
   **moltiplicato ×0.25 a riposo**); emission lerp viola→ciano `vec3(0,1,1)`; pelle
   esterna (`dist>0.75`) flasha ciano in ricomposizione (`brightness=max(0,life-1)`);
   pelle media (`dist>0.55`) si accende al calare della life. **L'alpha del target porta
   `v_emission` per il bloom selettivo.**

6. **DOF/bokeh: NESSUN ruolo.** La pipeline contiene un Bokeh CoC fisico completo
   (fNumber/focalLength, stile KinoBokeh) ma l'unico PostProfile istanziato spedisce
   **`bokehAmount: 0`** (mai animato). Il look "grosso e morbido" = dimensione geometrica
   reale + shading per-vertex smooth su impostor da 10 tri + AO voxel + **bloom selettivo**
   (`bloomAmount:1.45, bloomRadius:.5, bloomThreshold:.35, bloomSelectiveStrength:.5`)
   + vignette + tinta viola `#382968` @ 0.05.

7. **Dimensioni**: `particleSize = 0.015` desktop / `0.0185` mobile (mobile: meno spore ma
   più GROSSE). Raggio mesh istanza 0.525 → diametro spora mondo ≈ 0.0158 vs bbox lettera
   0.568×0.744×0.222 → **diametro spora ≈ 1/47 dell'altezza lettera (~2.1%; ~2.6% mobile)**.
   Envelope di scala sulla life: shrink in morte, **pulse di overshoot** in rinascita
   (`linearStep(-1,-.2,life)*(linearStep(1.5,1,life)+max(0,1-abs(life-1.25)/.25)*.5)`).

### Surface Floater (2018, stesso DNA)
Sorgente scaricato da `surface-floater.lusion.co/src.zip`: GPGPU FBO pos/vel/rot; istanze =
`BoxBufferGeometry(1.5,0.5,0.5)` SHADED (di nuovo: geometria istanziata illuminata, non
punti additivi); fisica = SDF baked del modello in 3D texture sliced + forze in/out +
curl4 + damping 0.5. Conferma il pattern Lusion: **GPGPU surface-constrained + geometria
istanziata shaded + curl noise**.

> Nessun case study/talk/tweet pubblico spiega la tecnica DDD (pagina progetto Lusion =
> solo marketing; il pezzo Codrops su Lusion 2026-04 non copre DDD).

## 2. Perché i nostri sprite non leggono come "spore" (agente impostor)

- **Additive = sola emissione di luce.** `ONE/ONE` può solo SOMMARE energia: ogni overlap
  schiarisce, monotono verso il bianco. Un oggetto opaco fa l'opposto: **occlude** e mostra
  shading **anche in scuro** (lato ombra, AO). L'additivo non può produrre un pixel più
  scuro dello sfondo → nebbia luminosa, mai massa.
- **Additive scarta profondità/ordine**: nessuna particella ne nasconde un'altra → zero
  occlusion cue, il segnale "solido" più forte che l'occhio usa. Il falloff gaussiano
  cancella anche la silhouette; silhouette circolari nette + occlusione inter-particella
  sono esattamente ciò che fa leggere "spore/caviale/schiuma" invece di "gas".
- Il tone mapping (ACES) schiaccia le somme additive HDR in bianco uniforme.

### Ricetta sphere-impostor (per quad billboard esistenti)
```glsl
vec2 p = quadUv * 2.0 - 1.0;          // [-1,1]
float r2 = dot(p, p);
if (r2 > 1.0) discard;                 // cutoff DURO (niente feather!) → depthWrite valido
vec3 N = vec3(p, sqrt(1.0 - r2));      // normale sfera view-space
float lambert = max(dot(N, normalize(vec3(0.4, 0.6, 1.0))), 0.0);
float rim = pow(1.0 - N.z, 2.0);       // banda rim alla silhouette
float ao = mix(0.55, 1.0, hash(id));   // variazione di valore per-particella (fake AO)
vec3 col = bodyColor * (0.25 + 0.75 * lambert) * ao + rimColor * rim * rimStrength;
// alpha 1.0 — cutout opaco
```
Stato render: `NormalBlending`, `transparent:false` (o `alphaTest`), `depthWrite:true`,
`depthTest:true`. AA del bordo senza perdere depthWrite: `alphaToCoverage:true` su target
MSAA (TSL `shapeCircle()` fa già il ramo fwidth+A2C / cutoff binario).
- **Depth per-fragment NON serve a queste dimensioni** (Ben Golus, gltut): la depth al
  centro + cutoff duro dà già occlusione corretta per-particella; il depth ray-traced
  serve solo per sfere GRANDI che si interpenetrano visibilmente. (TSL: `material.depthNode`
  se mai servisse.)
- **WebGPU non ha point sprites** (point-list = 1px fisso; `pointUV` TSL = solo backend
  WebGL). I nostri quad istanziati o `SpriteNodeMaterial` sono già la strada giusta.
- AO packed-spheres, 3 livelli: (1) hash darkening per-particella (`mix(0.55,1,hash)`) +
  hue-jitter ±2–4°; (2) AO analitico sfera-su-punto di Inigo Quilez
  (`0.5*(r/d)²*clamp(dot(n,dir),0,1)`) accumulato dai K vicini NEL COMPUTE (anche ogni
  N frame); (3) light field voxel alla DDD. Supplementi cheap: ambient come gradiente
  verticale `0.6+0.4*N.y`, rim solo sul lato in ombra `rim*(1-lambert)`.
- Fonti: gltut cap.13 "Lies and Impostors"; Ben Golus "Rendering a Sphere on a Quad" e
  "Anti-aliased Alpha Test"; three.js forum "How to draw spheres using Points"; IQ sphereao;
  Speck (github.com/wwwtyro/speck) = benchmark visivo "packed matte spheres" sul web.

## 3. Istanze mesh da storage buffer su three r184 (agente instanced)

**Fattibile e dimostrato ufficialmente** ben oltre i nostri numeri (esempi r184):
`webgpu_compute_particles_snow` = **100k istanze** sphere-like da compute storage;
`webgpu_compute_particles_rain` = 50k; `webgpu_compute_birds` = 8k mesh complete;
`webgpu_tsl_compute_attractors_particles` = 262k sprite.

### Idiomi chiave (pattern "snow", verbatim)
```js
const mesh = new THREE.Mesh(icoGeometry, nodeMaterial); // NON InstancedMesh!
mesh.count = N;                  // Object3D.count → draw istanziato su WebGPURenderer
mesh.frustumCulled = false;      // posizioni sul GPU, la CPU non può cullare

material.positionNode = positionLocal
  .mul(scaleBuffer.toAttribute())     // scala per-istanza
  .add(positionBuffer.toAttribute()); // posizione per-istanza
```
- `Mesh` + `.count` (pattern rain/snow), NON `InstancedMesh` (allocherebbe un
  `instanceMatrix` 16-float×N morto).
- **Render stage: SOLO `.toAttribute()`** (espone lo storage come attributo per-istanza,
  unica forma che funziona anche sul fallback WebGL2 — `instancedArray.element()` ignora
  l'indice sul backend WebGL, issue **#31221**, ancora aperta a r184). `.element(instanceIndex)`
  resta confinato al compute. ⚠️ il nostro render compute attuale usa
  `positionBuffer.element(instanceIndex)` nel vertex → da migrare a `.toAttribute()`.
- Letture di attributi in `colorNode` → varying auto-generati (nessun plumbing manuale).
- Geometria: `IcosahedronGeometry(r, 1)` (80 tri) per 10–30k; detail 0 (20 tri) a 60k o
  mobile. DDD usa un emisfero da 10 tri = ancora più economico.
- Budget: 60k × detail-1 ≈ 4.8M tri in un draw = routine per desktop GPU; opachi + early-Z
  spesso più economici per-pixel dei nostri sprite additivi con overdraw.
- Packing attributi: max 9 attribute slot su WebGPU (tip Codrops Gommage: impacchettare in
  pochi vec4).
- Fonti: sorgenti esempi r184 su github; Wawa Sensei TSL GPGPU (integrazione R3F);
  Maxime Heckel "Field Guide to TSL"; Codrops "WebGPU Gommage Effect".

## 4. Implicazioni per il nostro hero (gap vs spedito)

Spedito oggi (`ae85111`): 448²×2 ≈ **400k dischi piatti sfumati** (`smoothstep(0.5→0.18)`),
skin additiva α0.16, body `NormalBlending` ma `transparent:true, depthWrite:false`, size in
px device, colore flat per velocità. → velluto/nebbia, non spore. Direzione DDD-corretta:

1. **Tenere il compute sim** (molla+repulsione approssima bene il moto percepito).
2. **Sostituire la primitiva**: ~**30–50k** sfere shaded opache (emisfero/icosfera istanziata
   via `Mesh.count` + `positionNode`, o impostor sui quad esistenti), `depthWrite:true`,
   cutoff duro, lambert+rim, hash-AO.
3. **Size in WORLD space ≈ altezzaLettera/47** con varianza, NON px device (il packing deve
   sopravvivere a zoom/scale).
4. **Un layer di spore + occluder interno solido** (più semplice e più fedele dei due layer
   particellari attuali); `dist`-like attribute per core/skin behavior.
5. Albedo viola scuro (×0.25) a riposo; **emission→ciano solo su particelle veloci/in
   ricomposizione**, bloom selettivo via canale emission.
6. **Niente DOF** (DDD spedisce bokehAmount:0) → cassare l'item "hero-local DOF".
