I have everything needed. Composing the dossier now.

# LUSION TEXT-ANIMATION DOSSIER
Mined from `research/lusion-raw/hoisted.js` (prettified prod bundle), `home.html`, `project.pretty.html`, `project-rules.css`, `about.css`. All quotes verbatim from the bundle.

## 0. Architecture (read first â€” this is why it feels different)
- **No GSAP, no ScrollTrigger, no CSS keyframes for entrances.** Every text animation is evaluated **every frame** in one rAF loop: each element carries `_time += dt` (clamped), and styles are recomputed as `math.fit(_time - delay, 0, dur, FROM, TO, ease)` (fit = clamped remap + ease). Durations below are literal seconds.
- **Splitter:** the open-source **SplitType** library. `new SplitType(el, {types:"lines, words"})` / `{types:"words, chars"}`. Line masks are built manually: `c.style.position="relative", c.style.overflow="hidden"` on each SplitType line (hero), or lines re-wrapped in a created div: `n.style.position="relative"; n.style.overflow="hidden"; n.style.display="flex"; n.style.flexDirection="column"` (footer).
- **Trigger:** `scrollManager.getDomRange(el).screenRatio > -1` (element top crosses viewport bottom) flips `_animating=true`; `_time` climbs with dt while animating, **decrements** when not. **Replays: YES** â€” every section has `_needsReset`; when the section leaves the viewport all transforms are restored to their FROM state and timers zeroed (`this.showTime=0, this.domFooterLine1Time=0, this.domFooterLine2Time=0` in `ProjectItem`), so re-entry replays. Only the home hero is a one-shot (driven by `homePage.time - 1`, i.e. 1s after page ready, not by scroll).
- **Easings** (class `Ease`, offset ~587k): `lusion(e){return self$1.cubicBezier(e,.35,0,0,1)}` â†’ **cubic-bezier(0.35, 0, 0, 1)** â€” THE house ease (also used in raw CSS transitions). Plus Penner `expoOut` (`1-Math.pow(2,-10*e)`), `expoInOut`, `cubicInOut`, `elasticOut` (a=.1â†’amp 1, period .4). GSAP mapping: `CustomEase.create("lusion","0.35,0,0,1")`, `expo.out`, `expo.inOut`, `elastic.out(1,0.4)`.

## 1. HEADING animations (all ease.lusion unless noted)
**Hero H1 â€” word rise + un-rotate** (`#home-hero-title`, SplitType `"lines, words"`, each line overflow:hidden; CSS pre-state `.word{transform:translate3d(0,1.5em,0) rotate(15deg)}`):
```js
let t=Math.max(0,homePage.time-1);  // starts 1s after page ready
let a=t-r/20;                        // per-word delay = index * 0.05s, linear Lâ†’R
n.style.transform=`translate3d(0, ${math.fit(a,0,1,1.7,0,ease.lusion)}em, 0) rotate(${math.fit(a,0,.7,15,0,ease.lusion)}deg)`
```
â†’ y: **1.7em â†’ 0 over 1s**; rotation: **15deg â†’ 0 over 0.7s** (rotation lands first â€” that's the signature "settle").

**/projects wordmark â€” char roll-up + un-rotate** (`ProjectsMainSection`, split `"words, chars"`, reset state `translate3d(0,100%,0)` inside mask):
```js
let c=math.fit(this.domTitle._time*1.5-l/20-.2,0,1,100,0,ease.lusion),
    u=math.fit(this.domTitle._time*1.5-l/20-.2,0,1,30,0,ease.lusion);
a.style.transform=`translate3d(0, ${c}%, 0) rotate(${u}deg)`
```
â†’ per char: **y 100%â†’0 + rotate 30degâ†’0**, effective duration **1/1.5 â‰ˆ 0.67s**, delay **0.2 + i/20Â·(1/1.5) â‰ˆ 0.13 + 0.033Â·i s**. Project-count chars: same, no rotation, delay `i/20 + .5`. Arrow: `scale(ease.elasticOut(saturate(_time-.6)))` â€” elastic pop at +0.6s.

**Home featured title â€” char rise in em**: `y fit(t*1.5-i/20,0,1, 1â†’0 em) rotate(10â†’0 deg)`. **Goal section title** (words in line masks, `TITLE_STAGGER$1=40, TITLE_DELAY=.4`): `x fit(t-.4-i/40,0,1,200,0)px` + `y fit(t-i/40,0,1,100,0)%` â€” y leads, x trails by 0.4s. **End-section subtitle words**: `y 200%â†’0` (window .75) + `rotate 30degâ†’0` (window .8), delay = normalizedIndexÂ·0.15/0.1.

## 2. The LETTER-ROLL (slot machine) â€” grid-card project title
This is the one the owner means. **Not** 2 copies â€” **4 stacked copies** per character (`ProjectItemList` ctor, offset ~741k):
```js
let u=c.domFooterLine2.textContent.split("");c.domFooterLine2.textContent="";
u.forEach(f=>{let p=document.createElement("div");
p.classList.add("project-item-line-2-inner-list");p.style.display="flex";
p.style.flexDirection="column";p.style.transform="translateY(-400%)";
c.domFooterLine2List.push(p);
if(f===" ")p.style.width="0.3em";
else for(let g=0;g<4;g++){let v=document.createElement("span");v.textContent=f;p.appendChild(v)}
c.domFooterLine2.appendChild(p)})
```
CSS mask: `.project-item-line-2{overflow:hidden;font-size:3vw;height:1em}` `.project-item-line-2-inner{display:flex;overflow:hidden;bottom:.2em}`. Per-frame (offset ~737.6k):
```js
this.domFooterLine2Time+=e*.8;                             // time runs at 0.8x
let p=math.fit(f,0,len-1,Math.PI/2,3*Math.PI/2),           // char position â†’ angle
    g=math.saturate(this.domFooterLine2Time-Math.cos(p)/TEXT_STAGGER),  // TEXT_STAGGER=20
    v=math.fit(g,0,1,500,0,ease.expoInOut);                // translateY -500% â†’ 0
u.style.transform=`translate3d(${T}em, -${v}%, 0)`
```
â†’ each char column falls from **-500% to 0 with expoInOut** (the glyph spins past its 4 copies and lands), per-char duration **1/0.8 = 1.25s real**, **center-out cosine stagger**: `-cos(p)/20` gives center chars a **+0.05 head start (â‰ˆ62ms real)**, edges last â€” the word "blooms" from the middle. GSAP: `stagger:{each:0.06, from:"center"}` + `expo.inOut`, y from -500% on a 5-copy column (or 4 copies + start at -400%).

**Hover letter-shift + arrow (same element):** `hoverRatio` ramps at **2.5/s**; per char `T=fit(saturate(hoverRatio-Math.abs(u-len-1)/100),0,1,0,1.5,ease.lusion)` â†’ chars slide **right 0â†’1.5em**, per-char delay `(len+1-i)/100` (right-most chars move first, wave travels toward the arrow); icon `.project-item-line-2-icon{left:-1em}` gets `translateX(${fit(hoverRatio,.3,1,0,1,ease.lusion)}em)` â€” arrow slides into the vacated 1emâ€¦ mobile keeps everything pre-shifted (`translate3d(1.5em,0,0)`, arrow always visible).

**2-copy hover roll** (menu links, end-section, video title): char + `cloneNode(!0)` inside `div.char-wrapper{display:inline-block;height:var(--font-size)}`, copies stacked via `.char{float:left}` + `:last-child{clear:both}`; roll = wrapper `translateY(0â†’-100%)`. CSS version: `.header-menu-link:hover .header-menu-link-text{transform:translate3d(0,-100%,0)}` + clone from `100%â†’0`, **.4s cubic-bezier(.4,0,.1,1)**. **Idle rollup** (EndSection, `ROLLUP_ANIMATION_INTERVAL=2, ROLLUP_ANIMATION_DURATION=1`): every 2s pick `_randCharIndex=Math.floor(Math.random()*chars.length)` per word and roll only that wrapper `0â†’-100%` over 1s (delay `wordNorm*.2`, ease.lusion) â€” one random letter per word keeps flipping forever.

## 3. Eyebrow/label SCRAMBLE ("matrix text")
Card version (`TEXT_STAGGER=20, LETTER_PER_SECOND=40, MAX_RAND_LETTER_COUNT=5`):
```js
this.domFooterLine1Time+=e;let r=this.domFooterLine1Text,
n=Math.min(r.length,Math.floor(LETTER_PER_SECOND*this.domFooterLine1Time)-MAX_RAND_LETTER_COUNT),
a=Math.min(r.length,Math.floor(LETTER_PER_SECOND*this.domFooterLine1Time)),l="";
for(let c=0;c<n;c++)l+=r[c];
for(let c=0;c<a-n;c++)l+=String.fromCharCode(33+~~(Math.random()*93));
this.domFooterLine1.textContent=l
```
â†’ **charset: random printable ASCII 33â€“125** (`!`â€¦`}` â€” punctuation, digits, upper+lowercase); **reveal rate 40 chars/s**; **scramble head = 5 chars** (trailing garbage before the locked prefix); re-randomized **every frame**. **No loop** â€” one-shot; replays because time resets off-screen. Generic helper `TextAnimationHelper.setMatrixText(el, text, delay=0, lettersPerSecond=40, maxRand=2, refreshRate=1/15)` â€” site-wide labels use **head 2** and re-randomize at **15fps** (calmer); it supports `_direction=-1` to *un-type* (about page uses 30 chars/s in, 60 chars/s out).

## 4. BODY / PARAGRAPH copy â€” what Lusion actually does
- **Home flagship paragraph** (`#home-reel-desc` â€” an `h2`!): SplitType **words**; per word `opacity fit(t-i/100,0,1,.1,1,expoOut)` + `y fit(t-i/100,0,1,100,0,expoOut)%` â†’ 1s fade+rise, ultra-tight **0.01s/word** stagger (reads as one soft wave, not a word dance).
- **Small print / footer / disclaimers**: **line masks** (overflow-hidden wrappers), words `y fit(t-i/10,0,.6,100,0,ease.lusion)%` â€” 0.6s, 0.1s/line stagger. Nothing fancier â€” small copy only ever rises out of a line mask or fades.
- **Detail pages: NO text splitting at all.** Whole blocks fade + rise 30px in a cascaded window of `contentShowRatio` with differential horizontal parallax (quote, offset ~930.7k): title window 0â€“.65 expoInOut (+`scrollPane.x/2`), desc .4â€“.85, CTA .45â€“.9, services .5â€“.95 (`x/5`), links .55â€“1 (`x/4`) â€” all `(1-T)*30`px + `opacity=Math.min(v,T)`, expoOut.
- **Where body copy sits** (owner's "kill the right-hung annotations" question): Lusion never floats small annotations beside display type. Home: desc is a **right column, grid-column 7/span 6 â†’ 8/span 3 on wide**, `font-size:clamp(1rem,1.5vw,3rem)`, line-height 1.4, under it the pill CTA. Detail: one **34em meta column, absolutely centered** (`#project-details-meta{top:50%;width:34em;translateY(-50%)}`), title **4.5em/0.95**, then **left 60%** = desc (`.75em/1.5`, `max-width:30em`) + CTA, **right 40% (padding-left 20%)** = Services/Links lists (`.75em`, 2-col grid). Secondary copy is structural columns at body scale â€” not captions hung off headings.
- Blocks also drift with scroll position: `translate3d(0, showScreenOffset * -k px, 0)` with k = 0.5 (title) / 1.5 (desc) / 1.25 (CTA) â€” depth layering, recomputed every frame.

## 5. Scroll-VELOCITY effects
`ScrollManager`: `this.easedScrollStrength+=Math.abs(this.scrollViewDelta); this.easedScrollStrength+=(0-this.easedScrollStrength)*(1-Math.exp(-10*e)); â€¦=Math.min(â€¦,1)` â€” accumulate + exponential decay (10/s). **It is never applied to DOM type** â€” only to the WebGL card ripple: `u_rippleStrength.value=Math.min(.15,scrollManager.easedScrollStrength*.5)`. There is **no text shear/skew-by-velocity on lusion.co**; the "reactive" feel on text comes from the per-frame `showScreenOffset` parallax above. Don't build a skew effect if the brief is "the real Lusion thing".

## 6. Hover patterns (CSS, exact values)
- **Pill CTA**: text `translate3d(-1.5em,0,0)` (detail CTA: `-20%`); dot `translate3d(3emâ€¦5em,0,0) scale(20â€¦32)` floods the pill as new bg; arrow slides in (`translateZ(0)` from off-state); `transition:background cubic-bezier(.35,0,0,1) .5s .1s`â€“`.3s` delay.
- **Header "talk" btn**: text `+1.5em`, dots `scale(0)`, arrow in. **Back btn**: svg `-2em`, text `-1.3em`, svg2 `-1em` (chained arrow swap).
- **List rows** (awards): text `translate3d(1.3em,0,0)` + svg arrow in. **Menu links**: 2-copy roll, `.4s cubic-bezier(.4,0,.1,1)`.
- **Text links**: underline `:after` `scaleX(0â†’1)`, `transform-origin:0 0`, `.3s cubic-bezier(.16,1,.3,1)`.

## RECIPE CARDS (GSAP-ready)
| # | What | Trigger / replay | From â†’ To | Duration | Ease | Stagger |
|---|------|------------------|-----------|----------|------|---------|
| H1 | Hero words | 1s after preloader; one-shot | y 1.7em, rot 15Â° â†’ 0 | y 1s, rot 0.7s | lusion `cubic-bezier(.35,0,0,1)` | 0.05s/word, Lâ†’R |
| H2 | Big heading chars (wordmark) | el enters viewport; replays via reset | y 100% (masked), rot 30Â° â†’ 0 | 0.67s | lusion | 0.033s/char + 0.13s base |
| H3 | Goal title words (line masks) | viewport entry; replays | y 100%â†’0; x 200pxâ†’0 (x delayed +0.4s) | 1s each | lusion | 0.025s/word |
| H4 | End-title chars (2-copy wrappers) | activeRatio ramp (1s) | y 100%â†’0 | 0.7 window | lusion | wordNormÂ·.15 + charNormÂ·.15 |
| R1 | Letter-roll card title | card ratio âˆˆ(-1,1); replays | column y -500%â†’0 through 4 stacked copies, mask 1em | 1.25s | **expo.inOut** | cosine center-out, Â±62ms (eachâ‰ˆ0.06, from:"center") |
| R2 | Idle rollup | every 2s while section active | 1 random char/word wrapper y 0â†’-100% (clone below) | 1s | lusion | wordNormÂ·0.2 |
| S1 | Label scramble | viewport entry; one-shot, replays on re-entry | empty â†’ text | len/40 s | linear typing | head 5 random chars (cards) / 2 (labels), charset ASCII 33â€“125, refresh 1/15s (labels) or per-frame (cards) |
| B1 | Flagship paragraph words | viewport entry; replays | opacity .1â†’1, y 100%â†’0 | 1s | **expo.out** | 0.01s/word |
| B2 | Small copy lines | viewport entry; replays | y 100%â†’0 in line mask | 0.6s | lusion | 0.1s/line |
| B3 | Detail meta blocks | contentShowRatio (page-load scrub) | opacity 0â†’1, y 30pxâ†’0, x-parallax /2 /3 /5 /4 | windows 0â€“.65/.4â€“.85/.45â€“.9/.5â€“.95/.55â€“1 | expo.out (title expo.inOut) | 0.05 ratio steps |
| Hv1 | Card-title hover | mouseenter, ratio 2.5/s | chars x 0â†’1.5em; arrow (left:-1em) x 0â†’1em | 0.4s | lusion | (len+1-i)/100 â€” wave toward arrow |
| Hv2 | Menu/nav link | :hover | text y 0â†’-100%, clone y 100%â†’0 | 0.4s | `cubic-bezier(.4,0,.1,1)` | none |
| Hv3 | Pill CTA | :hover | text -1.5em; dot +3â€“5em scale 20â€“32; bg .5s | 0.4â€“0.5s | `cubic-bezier(.35,0,0,1)`, .1â€“.3s delay | none |
| Hv4 | Text link underline | :hover | scaleX 0â†’1, origin left | 0.3s | `cubic-bezier(.16,1,.3,1)` | none |

**Implementation notes for our GSAP port:** (1) register `CustomEase.create("lusion","0.35,0,0,1")` once and use it everywhere lusion is listed; (2) SplitType (not SplitText) matches their DOM exactly, incl. line-mask wrapping; (3) fire on viewport entry (IntersectionObserver / ScrollTrigger `once:false`) and **reset transforms when fully out** so everything replays like theirs; (4) rotations always resolve on a shorter timeline than translations (0.7 vs 1) â€” copy that ratio; (5) mobile (<812px / useMobileLayout): they `revert()` splits and skip all char/word animation entirely.