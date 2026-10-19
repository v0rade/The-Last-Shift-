import { TerminalEntry } from '../interaction/ComputerTerminal';

export interface StoryDocument {
  id: string;
  title: string;
  location: string;
  date: string;
  author: string;
  content: string;
  clueSummary: string;
}

export const STORY_DOCUMENTS: StoryDocument[] = [
  {
    id: 'doc_reception_log',
    title: 'Night Shift Directive — 02:00 AM',
    location: 'Reception & Security Desk',
    date: 'October 18 — 01:55 AM',
    author: 'Chief Security Officer R. Mercer',
    content: `TO: Night Shift Officer Hale (Reception Desk)
FROM: CSO R. Mercer

If the primary substation trips again tonight, the electromagnetic quarantine seals will lock the front exit automatically.

DO NOT PANIC. To restore emergency routing:
1. Retrieve the brass Maintenance Key from the Medical Examination Room (West Corridor).
2. Grab a Replacement High-Amp Fuse from the East Storage Room.
3. Unlock the Basement Service Corridor and reach the Electrical Maintenance Room.

Keep your flashlight charged. Spare lithium cells are stored throughout the wing.`,
    clueSummary: 'Maintenance Key is in Examination Room; Replacement Fuse is in Storage Room.'
  },
  {
    id: 'doc_exam_handover',
    title: 'Triage Report: Auditory Hypersensitivity',
    location: 'Medical Examination Room',
    date: 'October 17 — 09:40 PM',
    author: 'Dr. Clara Lin, Clinical Neurologist',
    content: `PATIENT: Technician Elias Ward (Bio-Acoustics Team)
SYMPTOMS: Ruptured tympanic membranes, severe disorientation, sub-vocal humming.

Ward kept repeating that Subject 09 doesn't see like we do—its optic nerves atrophied weeks ago, replaced by hyper-reactive acoustic and photo-thermal receptors.

"When you run, the floor joists ring like a bell," he whispered before sedation. "Crouch. Move slow. If it hears glass shatter across the room, it charges the sound blindly. And if you get inside a steel locker before it spots you, its thermal sense can't penetrate the shielding."

NOTE: I left the Basement Maintenance Key on the surgical tray beside Bed 2.`,
    clueSummary: 'Crouching reduces noise; steel lockers block detection; thrown glass decoys lure Subject 09.'
  },
  {
    id: 'doc_storage_inventory',
    title: 'Quartermaster Requisition & Fuse Notice',
    location: 'Storage Room',
    date: 'October 17 — 11:15 PM',
    author: 'Facilities Tech M. Kovács',
    content: `INVENTORY AUDIT — EAST STORAGE:
- 1x 200A Ceramic High-Amp Replacement Fuse (Shelf B)
- Empty borosilicate specimen bottles (Crate 4 — useful as acoustic decoys if thrown with [G])
- Steel Hazmat Lockers (inspected and latched)

REMINDER FOR ELECTRICAL MAINTENANCE:
The backup generator bus requires an exact 120V load to release the Research Lab mag-locks without tripping the thermal breaker.
- Circuit A1 (Primary Corridor & Bio-Lab Bus): 45V
- Circuit B2 (Cryo-Compressor Array): 30V [FAULTY - DO NOT ENGAGE]
- Circuit C3 (Security Grid & Mag-Lock Relay): 75V
- Circuit D4 (Incinerator Auxiliary Line): 50V

Engage ONLY A1 (45V) + C3 (75V) = 120V.`,
    clueSummary: 'Electrical Panel requires Fuse + Circuits A1 (45V) and C3 (75V) for 120V total.'
  },
  {
    id: 'doc_basement_warning',
    title: 'Service Conduit Inspection Log',
    location: 'Basement Service Corridor',
    date: 'October 18 — 01:10 AM',
    author: 'Facilities Tech M. Kovács',
    content: `I heard something crawling inside the overhead ventilation shaft above the Basement Service Corridor at 1:05 AM. It wasn't rats. The sheet metal bowed downward under at least ninety kilograms of weight, and every fluorescent ballast in the hall began to resonate at 60Hz.

When the backup breaker in the Electrical Room goes live, the acoustic surge is going to wake whatever broke out of Containment Pod 09. Make sure you know your route back to the Main Corridor before you pull that lever.`,
    clueSummary: 'Restoring power will draw Subject 09 into the corridors.'
  },
  {
    id: 'doc_electrical_schematic',
    title: 'Substation Load-Balancing Field Note',
    location: 'Electrical Maintenance Room',
    date: 'October 18 — 01:42 AM',
    author: 'Facilities Tech M. Kovács',
    content: `I tried bridging the panel without a fuse and blew the secondary relay. I'm going back to Storage for the spare fuse—if I make it.

Repeat for anyone reading this:
1. Seat the Replacement Fuse first.
2. Turn ON Circuit A1 (45V) and Circuit C3 (75V).
3. Leave B2 (30V) and D4 (50V) OFF.
4. Pull the Master Breaker to hit 120V and unlock the Research Laboratory.`,
    clueSummary: 'Confirming 120V = Circuit A1 (ON) + Circuit B2 (OFF) + Circuit C3 (ON) + Circuit D4 (OFF).'
  },
  {
    id: 'doc_lab_experiment',
    title: 'Dr. Vance Confidential Memo — Keypad Change',
    location: 'Research Laboratory',
    date: 'October 18 — 02:04 AM',
    author: 'Dr. Helena Vance, Lead Investigator',
    content: `PROJECT ECHOLOCATION — INCIDENT REPORT
Subject 09 ("The Resonant") was engineered to map subterranean cavities using bio-acoustic phase arrays. Instead, the neural graft fused with its brainstem. It perceives every footstep, heartbeat, and electromagnetic spike as an existential threat.

At 02:01 AM it shattered Pod 09's reinforced acrylic.

I left my Level-2 Access Card on the central lab bench and locked CSO Mercer inside the north Security Office to initiate the facility purge.
We changed the Security Office Keypad PIN to the exact time of the initial containment breach:

SECURITY KEYPAD PIN: 2413`,
    clueSummary: 'Security Office Keypad PIN is 2413. Level-2 Access Card is in the Research Lab.'
  },
  {
    id: 'doc_security_final_reveal',
    title: 'Final Confession — Truth of the Last Shift',
    location: 'Security Office',
    date: 'October 18 — 02:11 AM',
    author: 'CSO R. Mercer',
    content: `If you're reading this, Hale, I'm sorry. You weren't scheduled for the night shift by coincidence.

Corporate ordered the exterior blast doors sealed from the outside at 01:30 AM. They left one guard on duty at Reception as a live acoustic baseline to keep Subject 09 inside the upper wing while the evidence shredders ran.

I refused to let you die in the dark. I overrode the exterior quarantine lock from my terminal before the creature breached the vent behind me.

Take my Master Override Keycard from the desk. With your Level-2 Access Card, restored backup power, and Purge Code 7904, the North Quarantine Airlock will open. Run.`,
    clueSummary: 'Final Reveal: The shift was a corporate containment trap. Use Master Override Keycard + Purge Code 7904 at the Final Exit Airlock.'
  }
];

export const TERMINAL_DATA: Record<string, { name: string; entries: TerminalEntry[] }> = {
  terminal_lab: {
    name: 'RESEARCH LAB WORKSTATION [AETHER-BIO-01]',
    entries: [
      {
        id: 'term_lab_1',
        title: 'SUBJECT 09 BIOMETRIC TELEMETRY',
        timestamp: '2026-10-18 01:58:12',
        author: 'Dr. H. Vance',
        body: `SPECIMEN: Subject 09 ("The Resonant")
HEART RATE: 184 BPM (Hyper-metabolic state)
ACOUSTIC RANGE: Detects sprint vibrations up to 14.5m; walking up to 6.5m; crouched steps < 2m.
VISUAL ACUITY: Phototropic sensitivity to direct flashlight beams within 18m; blinded by solid walls and steel lockers.`,
        audioTranscript:
          '[AUDIO LOG - DR. VANCE]: "It mimics the facility hum to mask its approach. If your light flickers red, kill your sprint and get out of its line of sight immediately!"'
      },
      {
        id: 'term_lab_2',
        title: 'SECURITY OFFICE ACCESS OVERRIDE',
        timestamp: '2026-10-18 02:05:44',
        author: 'Dr. H. Vance',
        body: `NORTH CORRIDOR SECURITY OFFICE STATUS: LOCKED
KEYPAD AUTHENTICATION CODE: 2413
REQUIRED FOR EVACUATION: Collect the Level-2 Research Card from this laboratory, then unlock the Security Office (PIN 2413) to retrieve CSO Mercer's Master Override Keycard.`
      }
    ]
  },
  terminal_security: {
    name: 'SECURITY COMMAND TERMINAL [SEC-CORE-09]',
    entries: [
      {
        id: 'term_sec_1',
        title: 'QUARANTINE AIRLOCK PURGE PROTOCOL',
        timestamp: '2026-10-18 02:10:03',
        author: 'CSO R. Mercer',
        body: `NORTH EXIT AIRLOCK OVERRIDE INITIALIZED.
To disengage the Quarantine Blast Seal at the North Exit Area:
1. Ensure Backup Generator Power (120V) is active.
2. Present BOTH the Level-2 Research Access Card and the Master Override Keycard.
3. Enter Final Lockdown Purge Code: 7904.`,
        audioTranscript:
          '[AUDIO LOG - CSO MERCER]: "Hale—if you made it to Security, take the Master Keycard off my desk. The final airlock purge code is 7-9-0-4. Once you trigger the airlock, the siren will draw Subject 09 straight to the north hall—don\'t look back!"'
      },
      {
        id: 'term_sec_2',
        title: 'CORPORATE DIRECTIVE 99-OMEGA (DECRYPTED)',
        timestamp: '2026-10-18 01:28:00',
        author: 'Aether Board of Directors',
        body: `CLASSIFICATION: BLACK
All research personnel evacuated at 01:15 AM. Night Shift Officer Hale retained on-site without notification to maintain biological lure profile for Subject 09 until thermal sterilization crew arrives at dawn.`
      }
    ]
  }
};
