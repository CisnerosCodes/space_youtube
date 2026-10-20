# Signal Delay mascot v3: sturdier cat, acting library, director API

The owner's note on the first Short: the cat had the same problem as the slides (a sticker that pops in and sits still), and the neck was too thin. v3 fixes both. The neck is now a sturdy column in a stand-up collar. A new acting library makes him travel, react and stay alive in every frame. Everything is still a pure function of time (`state = f(t)`), so any frame renders the same in any order.

v2 is untouched. The v3 `drawCat` still accepts every v2 call, so the motion v2 Short can switch rigs by changing one path. `qa/compat_v2_calls.png` shows the v2 peek and point calls on the v3 rig.

## Files

| Path | What it is |
|---|---|
| `rig/core.mjs` | Math, state, IK limbs, presets, faces, eyes, mouth, effects |
| `rig/catA.mjs` | Draws the cat (`draw`, `drawCat`) plus `keyPoints` and `bodyXfPt` for attachments and bounds |
| `rig/actor.mjs` | The acting library and director: `Actor`, moves, gestures, idle, talk, follow-through, motion blur, placement helpers |
| `build/bundle.mjs` | Bundles the three modules into one plain script (`M_core`, `M_cat`, `M_actor`) for pages that run from `file://` |
| `build/build.mjs` | Writes `demo.html`, `sheet.html`, `moves.html` |
| `build/shot.mjs` | Screenshots a page: `node build/shot.mjs page.html out.png [w] [h] [t]` |
| `src/demo.scene.js` | The showcase scene (layout, captions, Mars photo, the cat's timeline) |
| `demo.html`, `demo.mp4` | 15 s, 1080 x 1920, 30 fps showcase (450 frames) |
| `contact.png` | Every 15th frame of the demo plus the last, labelled |
| `sheet.png` | Character sheet: new neck, the six expressions, size test, v2 and v3 neck side by side |
| `moves.png` | The move library: 20 moves frozen mid-action |
| `img/mars.webp` | Mars cutout (PIA00407, NASA/JPL/USGS), copied from `lab/design/v2/img` |
| `qa/` | QA sheets and crops from the three review rounds |

Rebuild and render:

```sh
cd lab/mascot/v3
node build/build.mjs                                   # demo.html, sheet.html, moves.html
node ../../motion-ab-test/render.mjs demo.html 15 30 demo_out   # frames + demo_out/video.mp4
node build/shot.mjs sheet.html sheet.png 2400 1350
node build/shot.mjs moves.html moves.png 2400 1792
```

`demo_out/frames/` is about 140 MB and was deleted after encoding. It is not covered by `.gitignore` (which only matches `out/frames/`), so delete it again after any re-render.

## What changed in the design

- **Neck.** 112 units wide, up from 46. The eye centres are 136 apart, so the neck is now close to the space between the eyes instead of a pencil. It rises out of a stand-up jacket collar (a band behind the neck and two stiff flaps in front), and the headset cable loops from the viewer-left ear cup into the collar. On screen the neck reads short and solid, and he still reads young and lanky: same big head, thin ink forearms and legs, jacket one size too big.
- **Kept exactly.** The logo eyes (solid amber disc viewer-left, hollow ring viewer-right, same radius, ring stroke 6/22 of the radius, centres 60/22 radii apart), the headset with its crooked mic, the oversized jacket with the echo mark, the tuft, the mitten paws. The eye, brow, mouth and effect code is copied unchanged from v2.
- **Never mirrored.** No negative scale exists anywhere in the rig or the actor. Asymmetric poses are built per side. Pointing left uses the left arm, and the disc stays viewer-left even while he tumbles.
- **Limbs are now numbers.** Arms and legs are small numeric specs solved by two-bone IK, so any two poses blend smoothly. In v2, named arm presets snapped halfway through a blend.
- **New body channels:** `crouch` (hips drop toward planted feet, knees bend outward), `sq` (squash and stretch about the feet), `lean`, plus per-ear twitch.
- **New paw and props:** a thumbs-up paw; a thruster skid board with a flame; a jet pack with flames; a sign on a stick, which counter-rotates to stay readable; the amber-dot scooter.

## Director API

```js
import { Actor, standOn, onCircle, motionBlur } from './rig/actor.mjs';

const cat = new Actor({ scale: 0.34, seed: 5, avoid: [captionRect], safe: [40, 200, 900, 1300] });
cat.timeline([
  { t: -0.12, do: 'enter', how: 'skid', from: 'left', to: [300, 1180] },  // starts before frame 0
  { t: 1.25, do: 'wave' },
  { t: 1.3,  do: 'say', text: 'Hi. I work the *night* shift.' },        // *word* = stressed
  { t: 2.45, do: 'point', at: [750, 950] },
  { t: 3.3,  do: 'hop', to: standOn(boxB) },
  { t: 4.85, do: 'fly', to: onCircle([540, 1000, 330], 0) },           // jet pack onto a planet top
  { t: 6.25, do: 'walk', around: [540, 1000, 330], toDeg: 22 },        // walk along the planet edge
  { t: 9.7,  do: 'float', to: [300, 1180], spin: 0.6 },
  { t: 14.45, do: 'exit', how: 'zip', to: 'right' },
]);

// per frame (t in seconds):
stage.innerHTML = cat.render(t);   // <g> in frame pixels (1080 x 1920), no extra transform needed
```

### World and conventions

- World space is frame pixels, y down. The actor's anchor is the point between his feet. `to: [x, y]` means "his feet end here". To stand on a box, pass the box's top edge (`standOn(rect, f)`).
- `scale` is pixels per rig unit. The standing figure is about 1100 units tall, so 0.34 is about 375 px and 0.4 about 440 px.
- `t` in the timeline may be negative, so frame 0 can open mid-move.
- Moves own the position. Gestures own the pose. If a gesture starts while he is travelling, it only takes the arms, head and face (pointing while riding the scooter works).
- Each travel move starts exactly where the previous one ended. If a move's own start differs, the gap fades out over 0.2 s, so nothing snaps. A new move cuts the previous one if it starts early.

### Constructor options

| Option | Default | Meaning |
|---|---|---|
| `scale` | 0.4 | px per rig unit |
| `seed` | 1 | seeds the blink and ear-flick schedules |
| `start` | `[-400, 1200]` | anchor before the first move (off-screen left) |
| `safe` | `[40, 200, 900, 1300]` | x, y, w, h of the zone he must stay in when not entering or exiting |
| `avoid` | `[]` | rectangles (caption boxes, photo subjects) used by `lint` and `fit` |
| `lag` | 3 | frames the arms, shoulders and tail trail the head |
| `idle` | true | `false` switches the idle loops off |

### Entrances and exits (`do: 'enter' | 'exit'`, pick with `how`)

| `how` | Parameters (defaults) | What he does |
|---|---|---|
| `enter skid` | `from: 'left'\|'right'`, `to`, `slide` 0.95, `dur` slide + 0.5 | Slides in on a thruster skid board, leaning back on the trailing edge. Rocks forward as it stops, then kicks the board away with a little hop and lands with a squash. |
| `enter drop` | `to`, `fall` 0.55 | Drops from above on a tether held in his raised paw. Bounces on the line with a decaying sway, touches down with a squash, lets go, and the line zips up. |
| `enter float` | `from`, `to`, `dur` 2.2, `spin` -1 (turns) | Zero-g: drifts in along a curve, slowly tumbling with limbs spread, then catches himself upright on a spring and lands softly. |
| `enter pop` | `box: [x,y,w,h]`, `at` 0.3 (0..1 across the box) | Ears and eyes rise over the box edge (he is clipped behind it), he looks left and right, ducks (anticipation), then jumps onto the top and lands. |
| `exit zip` | `to: 'right'\|'left'\|'up'` | Crouches and leans back (anticipation), then shoots off with a stretch along the motion, speed lines and a 1.6-frame shutter. |
| `exit float` | `to`, `dur` 1.6, `spin` 0.6 | Drifts away, tumbling. |
| `exit jet` | `to: 'left'\|'right'\|'up'` | The jet pack takes him out of frame. |
| `exit tether` | `dur` 0.75 | A line drops and yanks him up and out. |

### Travel moves

| `do` | Parameters (defaults) | What he does |
|---|---|---|
| `hop` | `to`, `height` (max(90, 0.28 x distance) above the higher end), `air`, `flip` | Crouch (anticipation), stretch on take-off, tuck at the apex, reach for the landing, squash for 2 frames, small rebound. The path is a parabola. |
| `walk` | `to`, or `around: [cx, cy, r]` + `toDeg` (0 = top of the circle, + = clockwise); `style: 'scamper'`; `speed` (px/s); `face` | Steps are locked to the distance covered, so feet never slide. Two body bobs per cycle, arms swing against the legs, he leans into the walk, and the tail sways. With `around`, he walks on a planet's edge and rotates with the surface normal. |
| `scoot` | `to`, `via` (quadratic control point), `ride` | The amber dot pops in as a scooter wheel. He hops on, rides an arc leaning into it, and the hollow echo ring trails the dot a beat behind (a signal and its echo). He hops off and the scooter folds away. |
| `swing` | `to`, `anchorY` -80, `swing` 1.0 | A line drops from above the frame into his raised paw. He swings a pendulum arc (the anchor is placed so both ends match), lets go and lands. |
| `fly` | `to`, `height` (160 + 0.25 x distance), `air`, `land` true | The jet pack pops on. He crouches, launches, flies a cubic arc tilted into his velocity with the flame tied to his speed, and lands with a flame burst and a squash. |
| `float` | `to`, `dur` 2.0, `spin` 0.5 | A zero-g drift between two points, starting from his current rotation (for example, off a planet edge). |
| `skid` | `to`, `slide` | A thruster-skid slide across the frame. |

All moves also take `scale` (per move) and `blend`.

### Gestures

| `do` | Parameters (defaults) | Notes |
|---|---|---|
| `point` | `at: [x,y]`, `dur` 1.3 | Picks the arm on the target's side. Pulls back first (anticipation), then springs onto the target with overshoot. Looks at the target, leans 3 degrees toward it, other paw on the hip. |
| `what` | `dur` 1.2 | Small dip, then both arms out with palms up on a spring. Shoulders up, head forward, mouth open, a short head shake. |
| `facepalm` | `dur` 1.7 | The paw accelerates into the face, the head knocks back on impact, eyes close, then a slow head shake. |
| `shrug` | `dur` 1.2 | Shoulders up on a spring, forearms out with palms up, head tilt, a "meh" face. |
| `thumbs` | `dur` 1.2 | The thumb pops up with a little bounce, and the ring eye winks. |
| `sign` (alias `card`) | `text`, `sub`, `size` 1.5, `face`, `dur` 1.8 | A sign on a stick pops up in his right paw and wiggles. It counter-rotates, so it stays upright on a tilted surface. |
| `bounce` | `count` 3, `period` 0.36 | Excited hops in place: squash before each take-off, tuck in the air, sparks, fists pumping. |
| `gasp` | `at`, `dur` 1.2 | A tiny inhale, then a lean back away from `at`, hands to cheeks, shock lines, a puffed tail and a shiver. |
| `nod` | `count` 2, `dur` 1.1 | Nods with a happy squint and an ear flick. |
| `listen` (alias `tilt`) | `dur` 1.4 | Slow head tilt, perked ear, a curious face that drifts slightly. |
| `wave` | `dur` 1.2 | Right paw waves at 2.6 Hz. |
| `emote` | `expr`, `dur` 1.2 | Springs into a full sheet expression (arms included). |
| `idle` | `dur` | Back to neutral. |

Gestures blend in over 4 frames (`blend`, in seconds) and back out over 0.25 s (`blendOut`). When a gesture starts before the previous one ends, the previous one is cut.

### Tracks

- `{ t, do: 'expr', expr: 'happy' }` sets the resting face. Options: neutral, curious, excited, shocked, sad, skeptical, angry, happy, wink, keen, wow, doh, meh, focus, relief, dizzy. It blends over 5 frames. Gestures and moves show their own faces on top of it.
- `{ t, do: 'look', at: [x, y] }` makes him look at the subject of the shot. `at: null` means the camera. The eyes move first and the head follows `lag` frames later. Gesture and move targets (`point`, `gasp`, `hop`, `fly`) take priority while they run.
- `{ t, do: 'say', words: [{ w, s, e, stress }] }` or `{ t, do: 'say', text, wps }` drives the mouth from word timings, one open-close per syllable. Stressed words get a head bob, an alternating small tilt and a brow lift. For real narration, pass word times from the caption alignment (`lab/design/v2/captions.json` has `start` and `end` per word).

### Always on (idle and follow-through)

- Breathing bob (0.42 Hz) on the shoulders, head and a slight squash.
- Blinks on a seeded, varied schedule (1.5 to 4.2 s apart, about 1 in 5 a double blink): close 2 frames, hold 1, open 3.
- Ear flicks on their own seeded schedule, alternating ears; tail sway on two frequencies; micro look drift.
- Overlapping action: the head and face are evaluated at `t`, and the arms, shoulders, lean and tail at `t - lag`.
- Follow-through: a damped spring driven by the root's velocity changes. It is computed as a sum over the past 18 frames, so it stays a pure function of `t`. It swings the tail and ears and drags the head when he starts, stops or lands.

### Output and checks

| Method | Returns |
|---|---|
| `render(t, opt)` | SVG `<g>` in frame pixels: world extras (lines, echo ring, speed lines) behind the cat, then the cat. Clipped behind boxes during `enter pop`. Returns `''` when he is far off-screen. `opt` takes the `draw` options (`keyline`, `rim`, `rimW`). |
| `stateAt(t)` | `{ R, s }`: the root (`x, y, rot, k, st, sa`) and the full rig state, for debugging or custom drawing. |
| `rootAt(t)` | The root only (cheap). |
| `box(t)` | World bounding box `[x, y, w, h]` of the drawn figure, props included. |
| `blur(t)` | `{ n, shutter }`: sub-frame samples for motion blur. `n` is 1 below 12 px of travel per shutter, otherwise 4 to 16 samples at most 1.5 px apart. `shutter` is 0.5 frames, or 1.6 on `exit zip`. |
| `lint(t0, t1, rects, { tol, safe })` | Frames where he overlaps a rectangle or leaves the safe zone (entrances and exits are exempt from the safe zone; standing on a box top is not an overlap). |
| `fit([x, y], { avoid, safe, pad })` | The anchor nearest to `[x, y]` where the standing figure clears every rectangle and stays in the safe zone. |
| `extent()` | The standing figure's extent around the anchor, in px. |

Helpers exported by `actor.mjs`: `standOn(rect, f)`, `onCircle([cx, cy, r], deg)`, `wordsFrom(text, t0, wps)`, `motionBlur(frame, t, n, shutter)`, `EASE` (the design-system `enter`, `move`, `exit` curves plus `io`, `in`, `out`), `spring(t, zeta, f)` (the Motion.md formula), `impact`, `bump`, `ramp`, `rnd`, `MOVE_NAMES`, `GESTURE_NAMES`.

### Motion blur

`motionBlur(frame, t, n, shutter)` renders `frame(tt)` `n` times across the shutter and averages them exactly. **Each sample must be an opaque full frame** (draw the background inside `frame`). Samples stack with opacity `1/(i+1)` in nested groups of at most four. Chromium composites each layer in 8 bits, and a flat stack of 16 drifted the ink by 2 levels in tiles, which showed as faint rectangles. Two things did not work: `mix-blend-mode: plus-lighter` is not isolated in Chromium SVG, and it quantizes too coarsely. In the demo, the frame's `n` is the larger of the cat's `blur(t).n` and the speed of the scene's own movers:

```js
function renderAt(t) {
  const { n, shutter } = cat.blur(t);
  stage.innerHTML = motionBlur((tt) => background(tt) + captions(tt) + cat.render(tt), t, n, shutter);
}
```

### Using it in the Short pipeline (motion v2 template)

`lab/design/v2/build.mjs` currently bundles the v2 rig into `CatRig`. To use the v3 actor:

```js
import { bundle } from '../../mascot/v3/build/bundle.mjs';
const { js, info } = bundle();      // put js into the page; it defines M_core, M_cat, M_actor
// in the page:
const cat = new M_actor.Actor({ scale: 0.42, avoid: [captionRect], seed: 7 });
cat.timeline([
  { t: F.hook / 30,    do: 'enter', how: 'pop', box: captionRect, at: 0.2 },
  { t: F.slowly / 30,  do: 'gasp', at: phobosCentre },
  { t: F.phobos / 30,  do: 'exit', how: 'zip', to: 'up' },
]);
// renderCat(f): $('catG').innerHTML = cat.render(f / 30);   (no transform: the actor is in frame pixels)
```

Then remove the old `catClip` rectangle: `enter pop` clips him behind the box itself. Run `cat.lint(0, duration, [captionRect, ...])` during the build and fail on any hit.

### Low-level rig (unchanged entry point)

`drawCat(params, opt)` still takes the v2 parameters (`expression`, `pose` including `'peek'` with `edgeY` and `'point'` with `pointAngle`, `lookX`, `lookY`, `blink`, `mouthOpen`, `earTwitch`, `tail`, `state`). It adds `legs` (`'stand' | 'dangle' | 'tuck' | 'spread' | 'wide'`) and `props`. `pose` also accepts any `ARMS` preset: `up`, `what`, `shrug`, `facepalm`, `thumb`, `card`, `balance`, `fly`, `grab`, `starfish`, `scoot`, `tuck`, `windup`, `pump`, `hips`, `hip1`, `wave`, `cheeks`, `chin`, `limp`, `relaxed`, `down`. `draw(state)` takes a full state from `state()`, `merge()` or `Actor.stateAt(t).s`.

## Demo (`demo.mp4`, 15 s)

All on the ink ground. One photo shot: Mars, PIA00407, credit "NASA/JPL/USGS" on screen while it is visible. The kicker names the move in progress. Fourteen moves, plus talking and idle throughout:

01 skid in onto the caption box · 02 wave while talking (mouth on word timings, head bobs on "Hi" and "night") · 03 point at the "On air." box · 04 hop onto it · 05 thumbs up with a ring-eye wink · 06 jet pack arc onto Mars as it rises into frame · 07 walk along the planet edge · 08 gasp at Valles Marineris · 09 sign "3,390 / KM RADIUS" (NASA: Mars radius 3,390 km) · 10 zero-g float off Mars, tumbling, catching himself onto the new caption box · 11 ride the amber-dot scooter with the echo ring trailing · 12 WHAT · 13 facepalm · 14 zip out with a speed smear.

Checks on the final build: `cat.lint` against the three caption boxes found 0 frames of overlap, and 0 frames outside the safe zone (x 40 to 940, y 200 to 1500) outside the entrance and exit. Fast moves (skid, hop, jet, float tumble, zip, the sliding boxes and Mars) get 4 to 16 sub-frame samples. Slower moves stay crisp.

## Unresolved

- The demo kicker shows move names (a reviewer aid), not one of the four series kickers, and the demo has no NEXT card. It is a library showcase, not a Short.
- The design system bans blur and asks for hard cuts. Motion blur here follows the owner's request, as motion v2 also did.
- The tail is always on the viewer-right side, because the cat is never mirrored. When he travels to the right, the tail streams forward rather than trailing behind him; the drag swing reads fine, but a trailing tail would need a second tail root.
- `fit` and `lint` use a bounding box, not the silhouette, so they are conservative around raised arms and the tail.
- Only `float` continues from a rotated start (for example, off a planet edge). Other moves begin upright and absorb any leftover rotation in the 0.2 s continuity fade.
- `enter skid` "riding the caption box like a skateboard" is not built. It needs the caption box itself to move, which belongs to the Short template, not the rig. The thruster-skid version is built.
- Not yet checked under the real YouTube Shorts overlay.
