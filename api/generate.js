// api/generate.js

const MARATHONS = {
  berlin: { name: "Berlin Marathon", elevation: "~58m, essentially flat", character: "Flat, fast, record-eligible.", coaching: "Tempo runs and consistent pacing. No hill work." },
  london: { name: "London Marathon", elevation: "~57m, flat", character: "Effectively flat.", coaching: "Tempo and pacing focus. No hill work." },
  chicago: { name: "Chicago Marathon", elevation: "~137m, flat with bridges", character: "Mostly flat, slight undulation.", coaching: "Tempo and pacing focus. Bridge undulations only." },
  tokyo: { name: "Tokyo Marathon", elevation: "~60m, nearly flat", character: "Nearly flat.", coaching: "Tempo and pacing focus. No hill work." },
  nyc: { name: "New York City Marathon", elevation: "~250m, rolling", character: "Rolling, hardest of the Majors.", coaching: "Hill repeats and undulating long runs. Conservative early pacing." },
  boston: { name: "Boston Marathon", elevation: "~248m, net downhill", character: "Fast early downhills, Newton Hills at miles 16-21.", coaching: "Hill repeats, downhill quad conditioning. Warn against going out too fast." },
  sydney: { name: "Sydney Marathon", elevation: "~317m, hilly", character: "The hilliest Major, undulating.", coaching: "Prioritize hill strength and downhill conditioning. Conservative pacing." },
  paris: { name: "Paris Marathon", elevation: "~436m, very hilly", character: "Exceptionally hilly.", coaching: "Heavy hill work, quad conditioning, conservative early pacing." },
  marrakech: { name: "Marrakech Marathon", elevation: "Flat, minimal gain, some false flats", character: "Flat and fast, palm groves, city walls.", coaching: "Tempo and consistent pacing. January race, mild winter." },
  casablanca: { name: "Casablanca Marathon", elevation: "~85-200m, essentially flat", character: "Flat and fast, World Athletics certified.", coaching: "Standard flat-course prep. October race, warm." },
  amsterdam: { name: "Amsterdam Marathon", elevation: "~59m, essentially flat", character: "Flat, sea level, canal bridges.", coaching: "Tempo and speed endurance. No hill work." },
  malaga: { name: "Malaga Marathon", elevation: "~157m, rolling", character: "Mild undulations. December, ~18C.", coaching: "Light hill work. Undulating long runs. Favorable winter climate." },
  valencia: { name: "Valencia Marathon", elevation: "Completely flat, sea level", character: "One of the fastest courses in the world. December.", coaching: "Pure speed and pacing focus. PB-optimized. No hill work." },
  sevilla: { name: "Sevilla Marathon", elevation: "Extremely low, ~10m variation", character: "Europe's flattest. February.", coaching: "Even splits and time-trial simulation. No hill work." }
};

const DISTANCES = {
  "5k": { label: "5K", planWeeks: "4-6", focus: "Speed, VO2 max intervals, short tempo runs", structure: "2 quality sessions + easy runs + 1 rest day" },
  "10k": { label: "10K", planWeeks: "6-8", focus: "VO2 max intervals, threshold tempo, race-pace work", structure: "2 quality sessions + easy runs + 1 long run" },
  "21k": { label: "Half Marathon", planWeeks: "10-12", focus: "Threshold training, tempo runs, progressive long runs", structure: "2 quality sessions + easy runs + 1 long run" },
  "marathon": { label: "Marathon", planWeeks: "12-18", focus: "Endurance, marathon-pace work, long runs, hill work if needed", structure: "2 quality sessions + easy runs + 1 long run + optional cross-training" }
};

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const {
      distance, race_type, marathon_key, custom_marathon, goal, target_time,
      age, sex, height_cm, weight_kg, pr_5k, pr_10k, pr_half, pr_marathon,
      weekly_km, days_per_week
    } = req.body;

    if (!distance || !DISTANCES[distance]) {
      return res.status(400).json({ error: "Invalid distance" });
    }

    const distInfo = DISTANCES[distance];
    const marathon = race_type === "known" ? MARATHONS[marathon_key] : null;
    const raceName = marathon?.name || custom_marathon || "unspecified";

    // PROMPT MODIFIÉ POUR VERROUILLER LES UNITÉS (KM et MIN/KM)
    const systemPrompt = `You are an expert running coach specializing in 5K, 10K, half marathon, and marathon training. Generate a personalized training plan based on the runner's profile, target distance, and (if applicable) the specific demands of their target race.

Adapt the plan structure to the distance:
- 5K: 4-6 weeks, speed-focused, short intervals, minimal long runs
- 10K: 6-8 weeks, VO2 max and threshold work, moderate long runs
- Half Marathon: 10-12 weeks, threshold and tempo focus, progressive long runs
- Marathon: 12-18 weeks, endurance and marathon-pace focus, long runs up to 32km

If a specific race is provided with elevation data, adjust hill work and pacing strategy accordingly. For flat courses, skip hill work.

STRICT RULES FOR UNITS AND PACES:
1. ALWAYS use kilometers (km) and minutes per kilometer (min/km). NEVER use miles or min/mile.
2. Calculate realistic paces based on the runner's provided Personal Records (PRs). If no PRs are provided, estimate based on their current weekly mileage and goal.
3. DO NOT invent paces that don't match their level.

Return the plan as a clean markdown table. Use standard markdown formatting:
| Week | Focus | Key Workouts | Long Run | Coaching Note |

IMPORTANT INSTRUCTION FOR KEY WORKOUTS:
In the "Key Workouts" column, do NOT write them inline. Instead, format them as an HTML unordered list (bullets) so they appear separated line by line. 
Example: <ul><li>Mon: 6 km easy @ 6:30 min/km</li><li>Wed: 5x800m @ 4:15 min/km</li><li>Sat: 20 km easy</li></ul>
Do NOT use <br> tags. Keep the rest of the table as clean markdown.`;

    const userPrompt = `DISTANCE: ${distInfo.label}
Plan length: ${distInfo.planWeeks} weeks
Training focus: ${distInfo.focus}
Weekly structure: ${distInfo.structure}

TARGET RACE (if provided):
Name: ${raceName}
Elevation: ${marathon?.elevation || "not applicable"}
Course character: ${marathon?.character || "not applicable"}
Coaching focus: ${marathon?.coaching || "general principles"}

RUNNER PROFILE:
Goal: ${goal}${target_time ? " (" + target_time + ")" : ""}
Age: ${age}, Sex: ${sex}
Height: ${height_cm}cm, Weight: ${weight_kg}kg
Personal records: 5k ${pr_5k || "N/A"}, 10k ${pr_10k || "N/A"}, Half ${pr_half || "N/A"}, Marathon ${pr_marathon || "N/A"}
Current weekly mileage: ${weekly_km}km
Available training days: ${days_per_week}

Generate the full week-by-week plan.`;

    // APPEL À GROQ
    const groqRes = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: "openai/gpt-oss-20b", 
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt }
        ],
        temperature: 0.7,
        max_tokens: 4000
      })
    });

    if (!groqRes.ok) {
      const errText = await groqRes.text();
      console.error("Groq error:", errText);
      return res.status(500).json({ error: "AI service unavailable. Check your Groq API key and limits." });
    }

    const data = await groqRes.json();
    const plan = data.choices?.[0]?.message?.content || "No plan generated";

    return res.status(200).json({
      plan,
      marathon: marathon || null,
      distanceLabel: distInfo.label
    });

  } catch (err) {
    console.error("Handler error:", err);
    return res.status(500).json({ error: "Internal server error" });
  }
}