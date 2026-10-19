# THE LAST SHIFT

**First-Person 3D Psychological Survival Horror Prototype**  
Built with **Vite**, **TypeScript**, **Three.js (WebGL)**, **Web Audio API**, **Vitest**, and **Playwright**.

---

## 1. Premise & Gameplay Overview

You are Night Shift Security Officer **Hale** at the **Aether-9 Nocturnal Biomedical Research Wing**. At **2:13 AM**, the primary substation fails, the exterior quarantine blast doors seal, and **Subject 09 ("The Resonant")** breaches Containment Pod 09.

To survive and escape the facility:
1. Explore the **Reception & Security Desk** using your flashlight (`F`) and read the Night Shift Directive.
2. Search the **Medical Examination Room** (West) for the **Basement Maintenance Key** and the **Storage Room** (East) for the **200A Replacement High-Amp Fuse** and **Glass Acoustic Decoys**.
3. Unlock the **Basement Service Corridor** and reach the **Electrical Maintenance Room**.
4. Solve **Puzzle A (Electrical Voltage Routing)** by seating the replacement fuse and routing **Circuit A1 (45V)** + **Circuit C3 (75V)** to match the **120V** target load.
5. Enter the newly unlocked **Research Laboratory**, recover the **Level-2 Research Access Card**, and inspect the Lab Workstation & Dr. Vance's memo to discover the Security Office PIN (`2413`).
6. Evade **Subject 09** using crouched movement (`Ctrl`), steel hiding lockers (`E`), and thrown glass sound decoys (`G`).
7. Unlock the **North Security Office** via **Puzzle B (Keypad PIN `2413`)**, collect CSO Mercer's **Master Override Keycard**, and decrypt the Security Command Terminal for the Final Lockdown Purge Code (`7904`).
8. Reach the **Final Quarantine Exit Area**, authorize both keycards and enter Purge Code `7904` (**Puzzle C**), and evacuate through the Exterior Airlock Hatch.

---

## 2. Controls

| Input | Action |
| :--- | :--- |
| `W` / `A` / `S` / `D` | Move Forward / Strafe Left / Backward / Strafe Right |
| `Mouse` (or `Arrow Keys`) | First-Person Look |
| `Shift` | Sprint (Drains Stamina, High Acoustic Noise) |
| `Ctrl` / `C` | Crouch (Hold or Toggle in Settings, Low Acoustic Noise) |
| `E` | Interact / Pick Up Item / Open Door / Hide in Locker |
| `F` | Toggle Flashlight |
| `G` | Throw Glass Sound Decoy |
| `R` | Reload Last Saved Checkpoint |
| `Esc` | Pause Game / Close Modal Panel |

---

## 3. Installation & Commands

```bash
# Install dependencies
npm install

# Start development server (http://localhost:5173)
npm run dev

# Run TypeScript type-checking
npm run typecheck

# Build production static bundle (dist/)
npm run build

# Preview production build locally (http://localhost:4173)
npm run preview

# Run unit and integration tests (Vitest)
npm test

# Run browser end-to-end tests (Playwright)
npm run test:e2e
```

---

## 4. Static Hosting Deployment

The production bundle (`npm run build`) outputs a self-contained static site into `dist/` with relative asset paths (`base: './'`):
- **Vercel / Netlify / Cloudflare Pages / GitHub Pages**:
  - Build command: `npm run build`
  - Output directory: `dist`
  - No backend or environment variables required.
