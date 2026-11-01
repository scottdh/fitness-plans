#!/usr/bin/env python3
"""Generate Zwift .zwo workout files for both plans.

Run from the repo root:  python3 scripts/gen_zwo.py
Writes zwo/scott/*.zwo, zwo/emma/*.zwo and zwo/index.json (used by the site to link files).
Powers are fractions of FTP, so Zwift scales them to whatever FTP is on the rider's profile.
"""
import json, os
from xml.sax.saxutils import escape

ROOT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "zwo")
M = 60
Z2 = 0.65

def WU(m, hi=0.65): return ("wu", m*M, 0.45, hi)
def CD(m): return ("cd", m*M, 0.62, 0.40, None)
def CDPF(m=3): return ("cd", m*M, 0.55, 0.40, [
    (0, "Pelvic floor time while you spin: 10 slow squeezes, hold up to 10 seconds, relax fully between."),
    (100, "Now 10 quick squeezes: squeeze and let go."),
    (160, "Done. Nice work.")])
def SS(m, p, msg=None, ev=None): return ("ss", m*M, p, msg, ev)
def IT(n, on, onp, off, offp, cad=None, msg=None): return ("it", n, on, onp, off, offp, cad, msg)
def FR(s, msg): return ("fr", s, msg)

def events(evs):
    return "".join(f'\n      <textevent timeoffset="{o}" message="{escape(m)}"/>' for o, m in evs)

def el(x):
    k = x[0]
    if k == "wu": return f'    <Warmup Duration="{x[1]}" PowerLow="{x[2]:.2f}" PowerHigh="{x[3]:.2f}"/>'
    if k == "cd":
        a = f'    <Cooldown Duration="{x[1]}" PowerLow="{x[2]:.2f}" PowerHigh="{x[3]:.2f}"'
        return a + (f'>{events(x[4])}\n    </Cooldown>' if x[4] else "/>")
    if k == "ss":
        evs = x[4] or ([(0, x[3])] if x[3] else [])
        a = f'    <SteadyState Duration="{x[1]}" Power="{x[2]:.2f}"'
        return a + (f'>{events(evs)}\n    </SteadyState>' if evs else "/>")
    if k == "it":
        _, n, on, onp, off, offp, cad, msg = x
        c = f' Cadence="{cad}" CadenceResting="85"' if cad else ""
        a = f'    <IntervalsT Repeat="{n}" OnDuration="{on}" OffDuration="{off}" OnPower="{onp:.2f}" OffPower="{offp:.2f}"{c}'
        return a + (f'>{events([(0, msg)])}\n    </IntervalsT>' if msg else "/>")
    if k == "fr": return f'    <FreeRide Duration="{x[1]}" FlatRoad="1">{events([(0, x[2])])}\n    </FreeRide>'

def dur(steps):
    t = 0
    for x in steps:
        if x[0] in ("wu", "cd", "ss"): t += x[1]
        elif x[0] == "it": t += x[1] * (x[2] + x[4])
        elif x[0] == "fr": t += x[1]
    return t

index = []
CTX = {}

def W(week, day, title, desc, steps, phase):
    mins = round(dur(steps) / 60)
    name = f"W{week:02d} {day} - {title}"
    xml = f'''<workout_file>
  <author>{CTX["author"]}</author>
  <name>{escape(name)}</name>
  <description>{escape(desc)} ({mins} min)</description>
  <sportType>bike</sportType>
  <category>{CTX["category"]}</category>
  <tags><tag name="{escape(phase)}"/></tags>
  <workout>
{chr(10).join(el(s) for s in steps)}
  </workout>
</workout_file>
'''
    fn = f"W{week:02d}-{day}"
    os.makedirs(CTX["dir"], exist_ok=True)
    with open(os.path.join(CTX["dir"], fn + ".zwo"), "w") as f: f.write(xml)
    CTX["files"].append(CTX["plan"] + "/" + fn)
    print(f"  {mins:4d} min  {name}")

def start(plan, author, category):
    CTX.update(plan=plan, dir=os.path.join(ROOT, plan), author=author, category=category, files=[])
    print(f"{author}: {category}")

# ---------------------------------------------------------------- Scott
start("scott", "Scott", "Spring Build")
z2 = lambda m, p=Z2: SS(m, p)
def z2ride(m, p=Z2): return [WU(10), SS(m-15, p, "Zone 2. Smooth and conversational. Nose-breathing pace."), CD(5)]
def ou_block(reps): return IT(reps, 120, 0.95, 60, 1.05, msg="Over-unders: 2' just under threshold, 1' just over. Stay seated.")
def cad(n): return IT(n, 60, 0.65, 60, 0.60, cad=105, msg="High cadence: 100+ rpm, light gear, quiet upper body.")
def ss(m, p=0.90, msg="Sweet spot. Comfortably hard, steady breathing."): return SS(m, p, msg)
def tempo(n, on, off, p=0.80): return IT(n, on*M, p, off*M, 0.60, msg="Tempo: steady, focused, still able to speak in short phrases.")
def rest(m, p=0.55): return SS(m, p, "Easy spin.")
def thirty(n): return IT(n, 30, 1.20, 30, 0.50, msg="30/30s: hard but controlled. Same power every rep. Try ERG off if cadence sags.")
def openers(): return [IT(3, 120, 1.05, 180, 0.55, msg="Openers: wake the legs up, don't dig deep.")] + sum([[FR(15, "Sprint! Out of the saddle."), SS(2.75, 0.55)] for _ in range(3)], [])
P1, P2, P3 = "Rebuild", "Engine", "Group-ride"
def thu(week, steps, title, desc, ph): W(week, "Thu", title, desc + " Thursday fallback if no weekend ride.", steps, ph)
# Week 1
# Week 1 Tue = Zwift built-in ramp test
W(1,"Sat","Z2 75","Zone 2 endurance.",z2ride(75),P1)
thu(1,z2ride(45),"Z2 45","Zone 2.",P1)
# Week 2
W(2,"Tue","Z2 + 3x5 tempo","Zone 2 with short tempo blocks.",[WU(10),z2(5),tempo(3,5,3),z2(1),CD(5)],P1)
W(2,"Sat","Z2 75 + 5x1 high cadence","Zone 2 endurance with leg-speed drills.",[WU(10),z2(20),cad(5),z2(30),CD(5)],P1)
thu(2,z2ride(45),"Z2 45","Zone 2.",P1)
# Week 3
W(3,"Tue","3x8 tempo","Tempo blocks.",[WU(8),tempo(3,8,3),CD(4)],P1)
W(3,"Sat","Drift test","Aerobic decoupling test. Fan on, bottle full, ERG on. Log average HR for minutes 15-45 and 45-75 in the tracker.",
  [WU(15),SS(60,0.67,None,[(0,"Drift test starts. Hold this power, no surges, steady cadence."),(1800,"Halfway. Note your average HR for the first half (min 15-45)."),(3540,"Last minute. Note your average HR for the second half (min 45-75).")]),CD(5)],P1)
thu(3,z2ride(45),"Z2 45","Zone 2.",P1)
# Week 4 deload
W(4,"Tue","Easy Z2 40","Deload week. Easy Zone 2.",[WU(10),SS(25,0.62,"Easy. Deload week."),CD(5)],P1)
W(4,"Sat","Easy Z2 75","Deload week. Easy Zone 2.",z2ride(75,0.62),P1)
thu(4,[WU(10),SS(25,0.62,"Easy. Deload week."),CD(5)],"Easy Z2 40","Deload.",P1)
# Week 5
W(5,"Tue","2x12 sweet spot","First sweet spot session.",[WU(10),IT(2,12*M,0.90,4*M,0.55,msg="Sweet spot. Comfortably hard."),CD(3)],P2)
W(5,"Sat","Z2 90","Zone 2 endurance.",z2ride(90),P2)
t58=[WU(10),tempo(2,8,4),z2(6),CD(5)]
thu(5,t58,"Z2 + 2x8 tempo","Zone 2 with tempo.",P2)
# Week 6
W(6,"Tue","2x15 sweet spot","Sweet spot.",[WU(8),ss(15),rest(4),ss(15),CD(3)],P2)
W(6,"Sat","Z2 + 3x10 tempo","Long ride with tempo.",[WU(10),z2(10),tempo(3,10,5),z2(20),CD(5)],P2)
thu(6,t58,"Z2 + 2x8 tempo","Zone 2 with tempo.",P2)
# Week 7
W(7,"Tue","3x10 sweet spot","Sweet spot.",[WU(6),ss(10),rest(3),ss(10),rest(3),ss(10),CD(3)],P2)
W(7,"Sat","Z2 100","Zone 2 endurance.",z2ride(100),P2)
t210=[WU(8),tempo(2,10,5),z2(3),CD(4)]
thu(7,t210,"Z2 + 2x10 tempo","Zone 2 with tempo.",P2)
# Week 8 deload
W(8,"Tue","Z2 + 4x1 high cadence","Deload week.",[WU(10),z2(12),cad(4),z2(10),CD(5)],P2)
W(8,"Sat","Z2 75","Deload week. Flex around Christmas.",z2ride(75),P2)
thu(8,z2ride(45),"Z2 45","Deload.",P2)
# Week 9
W(9,"Tue","2x18 sweet spot","Sweet spot.",[WU(5,0.70),ss(18),rest(3),ss(18),CD(3)],P2)
W(9,"Sat","Z2 105","Zone 2 endurance.",z2ride(105),P2)
thu(9,t210,"Z2 + 2x10 tempo","Zone 2 with tempo.",P2)
# Week 10
W(10,"Tue","2x20 sweet spot","Sweet spot.",[WU(5,0.70),ss(20),rest(3),ss(20),CD(2)],P2)
W(10,"Sat","Z2 + 2x15 tempo","Long ride with tempo.",[WU(10),z2(20),SS(15,0.80,"Tempo."),z2(10),SS(15,0.80,"Tempo."),z2(35),CD(5)],P2)
thu(10,t210,"Z2 + 2x10 tempo","Zone 2 with tempo.",P2)
# Week 11
W(11,"Tue","2x20 sweet spot high","Top of the sweet spot range.",[WU(5,0.70),ss(20,0.93,"Top of sweet spot. Hold form."),rest(3),ss(20,0.93,"Top of sweet spot. Hold form."),CD(2)],P2)
W(11,"Sat","Z2 120","Zone 2 endurance.",z2ride(120),P2)
thu(11,[WU(7),tempo(3,8,3),CD(5)],"Z2 + 3x8 tempo","Zone 2 with tempo.",P2)
# Week 12 (Tue = Zwift ramp test retest)
W(12,"Sat","Easy Z2 90","Deload week. Easy Zone 2.",z2ride(90,0.62),P2)
thu(12,z2ride(45),"Z2 45","Deload.",P2)
# Week 13
W(13,"Tue","3x9 over-unders","Over-unders.",[WU(8),ou_block(3),rest(4),ou_block(3),rest(4),ou_block(3),CD(2)],P3)
W(13,"Sat","Z2 120","Zone 2 endurance.",z2ride(120),P3)
t43=[WU(10),IT(4,3*M,0.82,3*M,0.60,msg="Tempo."),z2(6),CD(5)]
thu(13,t43,"Z2 + 4x3 tempo","Zone 2 with tempo.",P3)
# Week 14 (Sat = Zwift group ride)
W(14,"Tue","2 sets 8x30-30","Surge training.",[WU(10),thirty(8),rest(5),thirty(8),z2(9),CD(5)],P3)
thu(14,t43,"Z2 + 4x3 tempo","Zone 2 with tempo.",P3)
# Week 15
W(15,"Tue","3x12 over-unders","Over-unders.",[WU(6),ou_block(4),rest(3),ou_block(4),rest(3),ou_block(4),CD(2)],P3)
W(15,"Sat","Z2 135 tempo finish","Long ride, last 20 min at tempo.",[WU(10),z2(100),SS(20,0.80,"Tempo finish. Ride it like the end of a club ride."),CD(5)],P3)
thu(15,[WU(8),IT(4,4*M,0.82,3*M,0.60,msg="Tempo."),z2(4),CD(5)],"Z2 + 4x4 tempo","Zone 2 with tempo.",P3)
# Week 16 deload
W(16,"Tue","Z2 + 3x1 at 110","Deload week.",[WU(10),z2(10),IT(3,60,1.10,180,0.60,msg="Short, sharp, then easy."),z2(8),CD(5)],P3)
W(16,"Sat","Z2 90","Deload week.",z2ride(90),P3)
thu(16,z2ride(45),"Z2 45","Deload.",P3)
# Week 17 (Sat = Zwift group ride/race)
W(17,"Tue","3 sets 10x30-30","Surge training.",[WU(8),thirty(10),rest(4),thirty(10),rest(4),thirty(10),CD(3)],P3)
t53=[WU(8),IT(5,3*M,0.82,3*M,0.60,msg="Tempo."),z2(2),CD(5)]
thu(17,t53,"Z2 + 5x3 tempo","Zone 2 with tempo.",P3)
# Week 18 (Sat outdoor)
W(18,"Tue","2x12 SS + 6x1 at 120","Sweet spot then surges.",[WU(6),ss(12),rest(3),ss(12),rest(3),IT(6,60,1.20,60,0.50,msg="Surges: like closing a gap."),CD(2)],P3)
thu(18,t53,"Z2 + 5x3 tempo","Zone 2 with tempo.",P3)
# Week 19 (Sat outdoor)
b8=[IT(2,120,0.95,60,1.05,msg="Over-unders."),SS(2,0.95)]
W(19,"Tue","4x8 over-unders","Over-unders.",[WU(5)]+b8+[rest(2)]+b8+[rest(2)]+b8+[rest(2)]+b8+[CD(2)],P3)
thu(19,t53,"Z2 + 5x3 tempo","Zone 2 with tempo.",P3)
# Week 20 (Sat target ride)
W(20,"Tue","Openers","Openers.",[WU(12)]+openers()+[CD(4)],P3)
thu(20,[WU(10)]+[IT(2,120,1.05,180,0.55,msg="Openers.")]+sum([[FR(15,"Sprint!"),SS(2.75,0.55)] for _ in range(2)],[])+[CD(4)],"Short openers","Short openers the day before or two before the target ride.",P3)
scott_files = CTX["files"]

# ---------------------------------------------------------------- Emma
start("emma", "Emma", "Nap-Time Rides")
R1, R2, R3 = "Find your legs", "Build", "Stronger"
EZ = 0.60
def ewu(m=5): return WU(m, 0.60)
def easy(m, p=EZ, msg=None): return SS(m, p, msg)
def quick(n): return IT(n, 60, 0.60, 120 if n <= 3 else 60, 0.55, cad=95, msg="Quick legs: spin faster, 90+ rpm, light gear. Smooth, not bouncy.")
def steady(n, on, onp, off, msg="Steady: you can still chat in sentences."): return IT(n, on*M, onp, off*M, 0.55, msg=msg)
def brisk(n, p, msg="Brisk: breathing harder, then easy."): return IT(n, 30, p, 90, 0.55, msg=msg)
EXT = "If the nap's still going, keep riding easy in free ride once the workout ends."
def ride(week, day, title, desc, steps, ph): W(week, day, title, f"{desc} {EXT}", steps, ph)

ride(1, "Mon", "Easy + quick legs", "Easy spin with 3 x 1' quick legs.", [ewu(), quick(3), easy(3), CDPF()], R1)
ride(1, "Thu", "3x2 steady", "Three 2' steady efforts.", [ewu(), steady(3, 2, 0.70, 2), CDPF()], R1)
ride(2, "Mon", "Easy + quick legs", "Easy spin with 4 x 1' quick legs.", [ewu(), easy(5, 0.62, "Easy. Chatty pace."), quick(4), easy(4), CDPF()], R1)
ride(2, "Thu", "4x2 steady", "Four 2' steady efforts.", [ewu(), steady(4, 2, 0.72, 2), easy(1), CDPF()], R1)
ride(3, "Mon", "3x4 steady", "Three 4' steady efforts.", [ewu(4), steady(3, 4, 0.72, 2), CDPF()], R1)
ride(3, "Thu", "Easy + 5x30s brisk", "Easy spin with five 30-second brisk bursts.", [ewu(), easy(7, 0.62), brisk(5, 0.85), CDPF()], R1)
ride(4, "Mon", "Easy spin", "Lighter week. Easy all the way.", [ewu(), easy(12, EZ, "Lighter week. Keep it easy."), CDPF()], R1)
ride(4, "Thu", "Easy + quick legs", "Lighter week.", [ewu(), quick(3), easy(3), CDPF()], R1)
# Week 5 Mon = Zwift's built-in Ramp Test
ride(5, "Thu", "3x5 tempo", "First tempo session.", [ewu(), steady(3, 5, 0.75, 2, "Tempo: comfortably hard, short sentences only."), easy(1), CDPF()], R2)
ride(6, "Mon", "3x6 tempo", "Tempo blocks.", [ewu(), steady(3, 6, 0.78, 2, "Tempo: comfortably hard."), CDPF()], R2)
ride(6, "Thu", "6x30s brisk", "Easy spin with six brisk bursts.", [ewu(), easy(6, 0.62), brisk(6, 0.90), easy(4, 0.62), CDPF()], R2)
ride(7, "Mon", "2x9 tempo", "Longer tempo blocks.", [ewu(), steady(2, 9, 0.80, 3, "Tempo: settle in and hold it."), CDPF()], R2)
ride(7, "Thu", "8x30s brisk", "Easy spin with eight brisk bursts.", [ewu(), brisk(8, 0.95), easy(6, 0.62), CDPF()], R2)
ride(8, "Mon", "Easy spin", "Lighter week.", [ewu(), easy(17, EZ, "Lighter week. Keep it easy."), CDPF()], R2)
ride(8, "Thu", "Easy + quick legs", "Lighter week.", [ewu(), easy(5), quick(3), easy(3), CDPF()], R2)
ride(9, "Mon", "2x10 at 83%", "Two 10' blocks.", [ewu(), steady(2, 10, 0.83, 3, "Strong and steady. You'll want this to end, but you can hold it."), CDPF()], R3)
ride(9, "Thu", "3x3 at 88%", "Three 3' harder efforts.", [ewu(), steady(3, 3, 0.88, 2, "Hard but controlled."), easy(7, 0.62), CDPF()], R3)
ride(10, "Mon", "2x12 at 85%", "Two 12' blocks.", [ewu(), SS(12, 0.85, "Strong and steady."), easy(3, 0.55), SS(12, 0.85, "Last one. Hold it."), CDPF()], R3)
ride(10, "Thu", "4x3 at 90%", "Four 3' harder efforts.", [ewu(), steady(4, 3, 0.90, 2, "Hard but controlled."), easy(7, 0.62), CDPF()], R3)
ride(11, "Mon", "3x7 at 86%", "Three 7' blocks.", [ewu(), steady(3, 7, 0.86, 2, "Strong and steady."), CDPF()], R3)
ride(11, "Thu", "6x1 at 100%", "Backup if you skip the social ride.", [ewu(), IT(6, 60, 1.00, 120, 0.55, msg="One minute hard, two easy."), easy(9, 0.62), CDPF()], R3)
ride(12, "Mon", "Benchmark 20", "20' steady benchmark. Compare average power with week 7.", [ewu(), SS(20, 0.82, "Benchmark: steady 20'. Note your average power at the end."), easy(7, 0.62), CDPF()], R3)
ride(12, "Thu", "Celebration ride", "Easy-to-steady ride, your choice of route.", [ewu(), easy(10, 0.65), IT(3, 60, 0.95, 120, 0.60, msg="Three to finish, for fun."), easy(8, 0.62), CDPF()], R3)
emma_files = CTX["files"]

with open(os.path.join(ROOT, "index.json"), "w") as f:
    json.dump(sorted(set(scott_files + emma_files)), f)

# One zip per plan, so each rider can grab their whole set at once.
import zipfile
for plan in ("scott", "emma"):
    d = os.path.join(ROOT, plan)
    with zipfile.ZipFile(os.path.join(ROOT, f"{plan}.zip"), "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(os.listdir(d)):
            z.write(os.path.join(d, f), f)
