// Training plans. Percentages are of FTP; the app adds watt targets once FTP is set.
// Each plan: start date (a Monday), phases, a weekly session template, and per-week content.

window.PLANS = {
  scott: {
    id: "scott",
    name: "Spring Group-Ride Build",
    owner: "Scott",
    goal: "Hold a faster club group by spring, keeping the kettlebell week intact.",
    start: "2026-11-02",
    phases: [
      { id: 1, name: "Rebuild", range: "Weeks 1–4", blurb: "Ramp test first Tuesday, then mostly Zone 2." },
      { id: 2, name: "Engine", range: "Weeks 5–12", blurb: "Sweet spot Tuesdays, longer weekends. Retest week 12." },
      { id: 3, name: "Group-ride", range: "Weeks 13–20", blurb: "Surges, over-unders and group rides. Outdoors from March." }
    ],
    template: [
      { k: "mon", day: "Mon", off: 0, kind: "strength" },
      { k: "tue", day: "Tue", off: 1, kind: "ride", field: "tue" },
      { k: "wed", day: "Wed", off: 2, kind: "light" },
      { k: "fri", day: "Fri", off: 4, kind: "strength" },
      { k: "sat", day: "Sat", off: 5, kind: "long", field: "sat", minutes: "satMin", fallback: "thu" }
    ],
    labels: {
      strength: w => ({ t: "Kettlebell circuit", p: w.deload ? "Deload week: 2 rounds, easy pace." : "Hold volume steady. Anti-glycolytic rests (HR back near 120)." }),
      light: () => ({ t: "Light kettlebells", p: "Mobility warm-up, Turkish get-ups, suitcase carry." }),
      ride: "Zwift · quality",
      long: "Long ride",
      fallbackLabel: "No weekend ride? Thu"
    },
    weeks: [
      { ph: 1, tue: "Ramp test (Zwift's built-in test sets your FTP)", sat: "Z2 endurance", satMin: 75, thu: "45′ Z2", test: "tue" },
      { ph: 1, tue: "45′ Z2 with 3×5′ tempo @ 76–85%", sat: "Z2 with 5×1′ high cadence (100+ rpm)", satMin: 75, thu: "45′ Z2" },
      { ph: 1, tue: "45′ with 3×8′ tempo @ 76–85%", sat: "Drift test: 15′ warm-up, 60′ steady @ 65–70%, 5′ easy. No surges, same power throughout", satMin: 80, thu: "45′ Z2 (the drift test needs 80′, so move it to a weekend later)", drift: true },
      { ph: 1, tue: "40′ easy Z2", sat: "Z2 endurance, easy", satMin: 75, thu: "40′ Z2", deload: true },
      { ph: 2, tue: "2×12′ sweet spot @ 88–93%, 4′ easy between", sat: "Z2 endurance", satMin: 90, thu: "45′ Z2 with 2×8′ tempo" },
      { ph: 2, tue: "2×15′ sweet spot @ 88–93%", sat: "Z2 with 3×10′ tempo @ 76–85%", satMin: 90, thu: "45′ Z2 with 2×8′ tempo" },
      { ph: 2, tue: "3×10′ sweet spot @ 88–93%", sat: "Z2 endurance", satMin: 100, thu: "45′ Z2 with 2×10′ tempo" },
      { ph: 2, tue: "45′ Z2 with 4×1′ high cadence", sat: "Z2 endurance (flex around Christmas)", satMin: 75, thu: "45′ Z2", deload: true },
      { ph: 2, tue: "2×18′ sweet spot @ 88–93%", sat: "Z2 endurance", satMin: 105, thu: "45′ Z2 with 2×10′ tempo" },
      { ph: 2, tue: "2×20′ sweet spot @ 88–93%", sat: "Z2 with 2×15′ tempo @ 76–85%", satMin: 110, thu: "45′ Z2 with 2×10′ tempo" },
      { ph: 2, tue: "2×20′ sweet spot, top of range @ 91–94%", sat: "Z2 endurance", satMin: 120, thu: "45′ Z2 with 3×8′ tempo" },
      { ph: 2, tue: "Ramp test retest", sat: "Z2 endurance, easy", satMin: 90, thu: "45′ Z2", test: "tue", deload: true },
      { ph: 3, tue: "3×9′ over-unders (2′ @ 95% / 1′ @ 105%)", sat: "Z2 endurance", satMin: 120, thu: "45′ Z2 with 4×3′ tempo" },
      { ph: 3, tue: "2 sets of 8×30″ @ 120% / 30″ @ 50%", sat: "Zwift group ride (steady pace)", satMin: 90, thu: "45′ Z2 with 4×3′ tempo" },
      { ph: 3, tue: "3×12′ over-unders (2′ @ 95% / 1′ @ 105%)", sat: "Z2, final 20′ tempo @ 76–85%", satMin: 135, thu: "45′ Z2 with 4×4′ tempo" },
      { ph: 3, tue: "45′ Z2 with 3×1′ @ 110%", sat: "Z2 endurance", satMin: 90, thu: "45′ Z2", deload: true },
      { ph: 3, tue: "3 sets of 10×30″ @ 120% / 30″ @ 50%", sat: "Zwift group ride or race", satMin: 90, thu: "45′ Z2 with 5×3′ tempo" },
      { ph: 3, tue: "2×12′ sweet spot + 6×1′ @ 120%", sat: "First outdoor club ride, one group slower", satMin: 150, thu: "45′ Z2 with 5×3′ tempo" },
      { ph: 3, tue: "4×8′ over-unders (2′ @ 95% / 1′ @ 105%)", sat: "Outdoor ride 2.5–3h with surges", satMin: 165, thu: "45′ Z2 with 5×3′ tempo" },
      { ph: 3, tue: "Openers: 3×2′ @ 105%, 3×15″ sprints", sat: "Target: club ride with the faster group", satMin: 150, thu: "Short openers", target: true }
    ],
    tueMinutes: 45,
    // Week 1 Tuesday is a ramp test (~25 min); the chart uses 45 for every Tuesday.
    zwoPath: "zwo/scott/",
    pelvicFloor: false
  },

  emma: {
    id: "emma",
    name: "Nap-Time Rides",
    owner: "Emma",
    goal: "Fitness and energy, two rides a week that fit around naps.",
    start: "2026-11-02",
    phases: [
      { id: 1, name: "Find your legs", range: "Weeks 1–4", blurb: "20–25′ cores at an easy, chatty effort." },
      { id: 2, name: "Build", range: "Weeks 5–8", blurb: "Ramp test week 5. 30′ cores with tempo." },
      { id: 3, name: "Stronger", range: "Weeks 9–12", blurb: "Longer blocks. Swap in a social ride when you fancy it." }
    ],
    template: [
      { k: "mon", day: "Mon", off: 0, kind: "ride", field: "a", minutes: "aMin" },
      { k: "tue", day: "Tue", off: 1, kind: "yoga" },
      { k: "thu", day: "Thu", off: 3, kind: "ride", field: "b", minutes: "bMin" },
      { k: "sat", day: "Sat", off: 5, kind: "boxing" }
    ],
    labels: {
      yoga: () => ({ t: "Yoga", p: "Evening class." }),
      boxing: () => ({ t: "Boxing fitness", p: "Saturday morning. This is your hard session." }),
      ride: "Zwift ride",
      extension: "Nap still going? Keep riding 10–20′ easy in free ride."
    },
    weeks: [
      { ph: 1, a: "Easy spin with 3×1′ quick-legs (90+ rpm)", aMin: 20, b: "3×2′ steady, 2′ easy between", bMin: 20 },
      { ph: 1, a: "Easy spin with 4×1′ quick-legs", aMin: 25, b: "4×2′ steady, 2′ easy between", bMin: 25 },
      { ph: 1, a: "3×4′ steady @ ~72%, 2′ easy between", aMin: 25, b: "Easy spin with 5×30″ brisk", bMin: 25 },
      { ph: 1, a: "Easy spin, lighter week", aMin: 20, b: "Easy spin with 3×1′ quick-legs", bMin: 20, deload: true },
      { ph: 2, a: "Ramp test (Zwift's built-in test sets your FTP)", aMin: 20, b: "3×5′ tempo @ 75%, 2′ easy between", bMin: 30, test: "a" },
      { ph: 2, a: "3×6′ tempo @ 78%, 2′ easy between", aMin: 32, b: "6×30″ brisk @ 90%, 90″ easy", bMin: 30 },
      { ph: 2, a: "2×9′ tempo @ 80%, 3′ easy between", aMin: 32, b: "8×30″ brisk @ 95%, 90″ easy", bMin: 30 },
      { ph: 2, a: "Easy spin, lighter week", aMin: 25, b: "Easy spin with 3×1′ quick-legs", bMin: 25, deload: true },
      { ph: 3, a: "2×10′ @ 83%, 3′ easy between", aMin: 34, b: "3×3′ @ 88%, 2′ easy between", bMin: 30 },
      { ph: 3, a: "2×12′ @ 85%, 3′ easy between", aMin: 35, b: "4×3′ @ 90%, 2′ easy between", bMin: 35 },
      { ph: 3, a: "3×7′ @ 86%, 2′ easy between", aMin: 35, b: "Social ride: robopacer or group ride (or 6×1′ @ 100%)", bMin: 35 },
      { ph: 3, a: "Benchmark: 20′ steady @ 82%", aMin: 35, b: "Celebration ride: your choice of route or group ride", bMin: 35, target: true }
    ],
    zwoPath: "zwo/emma/",
    pelvicFloor: true
  }
};
