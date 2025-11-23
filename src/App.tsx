import { useState, type DragEvent } from "react";
import "./App.css";
import { romePoi } from "./romePoi";
import { londonPoi } from "./londonPoi"; 
import type { Poi } from "./romePoi";

type TripConfig = {
  city: string;
  numberOfDays: number;
  travelerType: string;
  mobilityPreference: string;
  pace: string;
  optimizationType: string;
};

type DayItinerary = {
  day: number;
  theme: string;
  places: string[];
  description: string;
  restaurant?: {
    name: string;
    cuisine: string;
    address: string;
    priceRange: string; // e.g. "$$", "$$$"
  };
};

type Itinerary = {
  pois?: Poi[];
  days: DayItinerary[];
};

// ⏱️ Average visit time per category (in minutes)
const estimatedVisitTimeByCategory: Record<string, number> = {
  museum: 120, 
  square: 30,
  church: 60,
  park: 90,
  viewpoint: 45,
  district: 120,
  street: 45,
  default: 60,
};

const defaultTripConfig: TripConfig = {
  city: "Rome",
  numberOfDays: 3,
  travelerType: "couple",
  mobilityPreference: "walking",
  pace: "medium",
  optimizationType: "distance-based",
};

function getCityKey(name: string) {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // rimuove accenti: Catanìa → catania
    .replace(/\s+/g, "-"); // "New York" → "new-york"
}

// pulisce eventuali ```json ... ``` attorno alla risposta del modello
function cleanJson(raw: string): string {
  let text = raw.trim();
  text = text
    .replace(/^```json\s*/i, "")
    .replace(/^```/, "")
    .replace(/```$/, "");
  return text.trim();
}

// 👇 NUOVA FUNZIONE: sceglie la lista di POI in base alla città
function getPoiSource(city: string): Poi[] {
  const key = city.trim().toLowerCase().replace(/\s+/g, "");

  if (key === "rome" || key === "roma") return romePoi;
  if (key === "london" || key === "londra") return londonPoi;

  return []; // per ora nessun POI per le altre città
}

function App() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [tripConfig, setTripConfig] = useState<TripConfig>(defaultTripConfig);
  const [visitedPoiIds, setVisitedPoiIds] = useState<string[]>([]);
  const [itinerary, setItinerary] = useState<Itinerary | null>(null);
  const [loading, setLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
// we will track the visited sites every day, not only day 1
  const [visitedByDay, setVisitedByDay] = useState<Record<number, string[]>>({});
const [dragging, setDragging] = useState<{
  dayIndex: number;
  poiIndex: number;
} | null>(null);
const [heroImageUrl, setHeroImageUrl] = useState<string | null>(null);      // for Step 3
const [heroImageLoading, setHeroImageLoading] = useState(false);            //  spinner


  const cityName = tripConfig.city || "your trip";

  // normalizzo il nome della città (usiamo davvero getCityKey)
  const cityKey = getCityKey(tripConfig.city);

  // mappa città → immagine specifica (tutte immagini di città)
  const cityHeroImages: Record<string, string> = {
    rome:
      "https://images.unsplash.com/photo-1549640360-223e0b1571dc?auto=format&fit=crop&w=1400&q=80",
    roma:
      "https://images.unsplash.com/photo-1549640360-223e0b1571dc?auto=format&fit=crop&w=1400&q=80",
    london:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
    londra:
    "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1400&q=80",
    catania:
      "https://images.unsplash.com/photo-1563298723-dcfebaa392e3?auto=format&fit=crop&w=1400&q=80",
    istanbul:
      "https://images.unsplash.com/photo-1587486913049-54b514eebc08?auto=format&fit=crop&w=1400&q=80",
    tokyo:
      "https://images.unsplash.com/photo-1480796927426-f609979314bd?auto=format&fit=crop&w=1400&q=80",
    naples:
      "https://images.unsplash.com/photo-1590447158019-883d8d11f11e?auto=format&fit=crop&w=1400&q=80",
    napoli:
      "https://images.unsplash.com/photo-1590447158019-883d8d11f11e?auto=format&fit=crop&w=1400&q=80",
  };

  // 🆕 prima prova l'immagine AI, poi quella di città, poi fallback generico
  const heroImage =
    heroImageUrl ||
    cityHeroImages[cityKey] ||
    "https://images.unsplash.com/photo-1500534314211-0a24cd03f2c0?auto=format&fit=crop&w=1400&q=80";

  const poiSourceForCity = getPoiSource(tripConfig.city);
  const hasDefinedPoi = poiSourceForCity.length > 0;



const handleTripConfigChange = (
  field: keyof TripConfig,
  value: string | number
) => {
  setTripConfig((prev) => ({
    ...prev,
    [field]: value,
  }));
};


  const toggleVisitedPoi = (id: string) => {
    setVisitedPoiIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const getPoiById = (id: string): Poi | undefined => {
    const poiSource = itinerary?.pois || getPoiSource(tripConfig.city);
    return poiSource.find((poi) => poi.id === id);
  };


  const buildMapUrlForDay = (day: DayItinerary) => {
  const poiSource = itinerary?.pois || getPoiSource(tripConfig.city);

  // Recuperiamo i POI corrispondenti agli id di places
  const poisForDay = day.places
    .map((id) => poiSource.find((poi) => poi.id === id))
    .filter((p): p is Poi => Boolean(p)); // rimuove undefined

  if (poisForDay.length === 0) {
    // fallback: cerca solo la città
    const cityQuery = encodeURIComponent(tripConfig.city || "");
    return `https://www.google.com/maps/search/?api=1&query=${cityQuery}`;
  }

  // Nome completo per ricerca ("Istiklal Street, Istanbul")
  const locations = poisForDay.map((poi) =>
  poi.mapQuery ? poi.mapQuery : `${poi.name}, ${tripConfig.city}`
);


  // Se c’è un solo POI, usa una ricerca semplice
  if (locations.length === 1) {
    const q = encodeURIComponent(locations[0]);
    return `https://www.google.com/maps/search/?api=1&query=${q}`;
  }

  // Se più POI → usiamo le "directions" con i waypoint
  const origin = encodeURIComponent(locations[0]);
  const destination = encodeURIComponent(
    locations[locations.length - 1]
  );

  const waypoints =
    locations.length > 2
      ? locations
          .slice(1, -1)
          .map((loc) => encodeURIComponent(loc))
          .join("|")
      : "";

  let url = `https://www.google.com/maps/dir/?api=1&origin=${origin}&destination=${destination}`;
  if (waypoints) {
    url += `&waypoints=${waypoints}`;
  }

  // 🚶‍♀️ Aggiungi questo solo se l’utente ha selezionato "walking"
  if (tripConfig.mobilityPreference === "walking") {
    url += `&travelmode=walking`;
  }

  return url;
};


  const handleDragStart = (dayIndex: number, poiIndex: number) => {
  setDragging({ dayIndex, poiIndex });
};

const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
  e.preventDefault(); // serve già per il drop
  if (e.dataTransfer) {
    e.dataTransfer.dropEffect = "move";      // no more "green +"
  }
};

const handleDrop = (targetDayIndex: number, targetPoiIndex: number) => {
  setItinerary((prev) => {
    if (!prev || !dragging) return prev;

    // 👉 per ora permettiamo drag & drop SOLO dentro lo stesso giorno
    if (dragging.dayIndex !== targetDayIndex) {
      return prev;
    }

    const daysCopy = [...prev.days];
    const day = daysCopy[targetDayIndex];
    const placesCopy = [...day.places];

    // rimuovo il POI dalla posizione originale
    const [moved] = placesCopy.splice(dragging.poiIndex, 1);
    // lo inserisco nella nuova posizione
    placesCopy.splice(targetPoiIndex, 0, moved);

    daysCopy[targetDayIndex] = { ...day, places: placesCopy };

    return { ...prev, days: daysCopy };
  });

  setDragging(null);
};

  const generateItinerary = async () => {
  setLoading(true);
  setItinerary(null);
  setHeroImageUrl(null); // resetto eventuale immagine AI precedente

  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    console.log("API KEY present?", !!apiKey);

    if (!apiKey) {
      alert("Missing VITE_OPENAI_API_KEY in .env.local");
      return;
    }

    let systemPrompt =
      "You are a smart travel planner for repeat visitors. " +
      "You must use only the provided POIs when available, exclude already visited ones, and adapt to traveler type and mobility.";

    let userPrompt = "";

    if (hasDefinedPoi) {
  const availablePois = poiSourceForCity.filter(
    (poi) => !visitedPoiIds.includes(poi.id)
  );

  systemPrompt +=
    ` For ${tripConfig.city}, you are given a curated list of POIs with id, name, category, neighborhood, and themes.`;

      userPrompt = `
User trip configuration:
- City: ${tripConfig.city}
- Days: ${tripConfig.numberOfDays}
- Traveler type: ${tripConfig.travelerType}
- Mobility: ${tripConfig.mobilityPreference}
- Pace: ${tripConfig.pace}
- Optimization: ${tripConfig.optimizationType}

Already visited POI IDs: ${visitedPoiIds.join(", ")}

Available POIs (not yet visited):
${JSON.stringify(availablePois, null, 2)}

Task:
Create an itinerary for the given number of days.

Rules:
- Do not include POIs that are in Already visited.
- For each day, choose 3–6 POIs depending on pace and traveler type.
- Keep each day internally coherent (by neighborhood and/or theme).
- Suggest realistic sequences (no crazy teleporting between far areas on foot).
- Write short human-friendly descriptions.

Output JSON schema:
{
  "days": [
    {
      "day": 1,
      "theme": "string",
      "places": ["poi-id-1","poi-id-2"],
      "description": "max 4 sentences",
      "restaurant": {
        "name": "string",
        "cuisine": "string",
        "address": "string",
        "priceRange": "$ | $$ | $$$"
      }
    }
  ]
}
Return only the JSON, no extra text.

`;
    } else {
      systemPrompt =
        "You are a smart travel planner for any city in the world. " +
        "You must propose realistic POIs, then build an itinerary, always expressing variety and coherence.";

      userPrompt = `
User trip configuration:
- City: ${tripConfig.city}
- Days: ${tripConfig.numberOfDays}
- Traveler type: ${tripConfig.travelerType}
- Mobility: ${tripConfig.mobilityPreference}
- Pace: ${tripConfig.pace}
- Optimization: ${tripConfig.optimizationType}

Task:
1. First, generate an array of 20–30 realistic POIs for this city.
   For each POI, include:
   - id (a short slug),
   - name,
   - category (museum, square, church, district, park, viewpoint, street, etc.),
   - neighborhood (or area),
   - themes (array of strings).
2. Then, using ONLY these POIs, create an itinerary for the given number of days.

Rules:
- For each day, choose 3-6 POIs depending on pace and traveler type.
- Keep each day internally coherent (by area and/or theme).
- Suggest realistic walking/transport.
- Write short human-friendly descriptions.

Output JSON schema:
{
  "pois": [
    { 
      "id": "string", 
      "name": "string", 
      "category": "string", 
      "neighborhood": "string", 
      "themes": ["string"] 
    }
  ],
  "days": [
    {
      "day": 1,
      "theme": "string",
      "places": ["poi-id-1","poi-id-2"],
      "description": "max 4 sentences",
      "restaurant": {
        "name": "string",
        "cuisine": "string",
        "address": "string",
        "priceRange": "$ | $$ | $$$"
      }
    }
  ]
}
Return only the JSON, no extra text.

`;
    }

    // 🔹 Chiamata per l'ITINERARIO
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
    console.log("generateItinerary raw response:", data);

if (!response.ok) {
  console.error("API error in generateItinerary:", data);
  throw new Error(`API error: ${response.status}`);
}

const raw = data.choices?.[0]?.message?.content;
if (!raw) {
  throw new Error("No content from model");
}

const cleaned = cleanJson(raw);
console.log("generateItinerary cleaned JSON:", cleaned);

const parsed: Itinerary = JSON.parse(cleaned);

    setItinerary(parsed);
    setVisitedByDay({});
    setStep(3);

    // 🎨 --- DA QUI IN GIÙ: immagine AI, come già avevamo ---

    const normalizedCity = tripConfig.city.trim().toLowerCase();

    const cityLandmarks: Record<string, string> = {
      rome: "the Colosseum in Rome, Italy",
      roma: "the Colosseum in Rome, Italy",
      tokyo: "Tokyo Tower and Shibuya Crossing in Tokyo, Japan",
      florence: "the Florence Cathedral (Duomo di Firenze), Italy",
      firenze: "the Florence Cathedral (Duomo di Firenze), Italy",
      paris: "the Eiffel Tower in Paris, France",
      newyork: "Times Square skyscrapers in New York City, USA",
    };

    const landmark =
      cityLandmarks[normalizedCity.replace(/\s+/g, "")] ||
      `an iconic landmark in ${tripConfig.city}`;

    const stylePrompt =
      tripConfig.travelerType === "couple"
        ? "romantic atmosphere"
        : tripConfig.travelerType === "family"
        ? "family-friendly travel style"
        : tripConfig.travelerType === "friends"
        ? "vibrant and social energy"
        : "adventurous travel photography";

    try {
  setHeroImageLoading(true); // 🔄 Inizia il caricamento

  const imageResponse = await fetch(
    "https://api.openai.com/v1/images/generations",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "dall-e-3",
        prompt: `Ultra realistic cinematic travel photograph of ${landmark}, ${stylePrompt}, no people, wide angle, professional travel photography, 16:9`,
        size: "1024x1024",
        n: 1,
      }),
    }
  );

  const imageData = await imageResponse.json();
  const cityImage = imageData?.data?.[0]?.url;
  if (cityImage) setHeroImageUrl(cityImage);
} catch (imgErr) {
  console.error("Image generation failed:", imgErr);
} finally {
  setHeroImageLoading(false); // 🟢 Stop spinner sempre
}

  } catch (err) {
    console.error(err);
    alert("Error generating itinerary. Check console.");
  } finally {
    setLoading(false);
  }
};


  const updateNextDays = async () => {
  if (!itinerary) return;

  const notVisitedByDay = (itinerary.days || [])
  .map((day) => {
    const visitedForDay = visitedByDay[day.day] || [];
    const notVisited = day.places.filter(
      (id) => !visitedForDay.includes(id)
    );

    return {
      day: day.day,
      visitedCount: visitedForDay.length,
      notVisited,
    };
  })
  // ✅ prendiamo SOLO i giorni in cui:
  // - hai spuntato almeno 1 POI (visitedCount > 0)
  // - ma NON li hai fatti tutti (notVisited.length > 0)
  .filter(
    (entry) => entry.visitedCount > 0 && entry.notVisited.length > 0
  );

  if (notVisitedByDay.length === 0) {
    alert("You marked all places as visited!");
    return;
  }

  setUpdating(true);
  try {
    const apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    if (!apiKey) {
      alert("Missing VITE_OPENAI_API_KEY in .env.local");
      return;
    }


    const systemPrompt =
  "You are updating an existing multi-day city itinerary. " +
  "You receive the current itinerary plus, for some days only, a list of POI IDs that were NOT visited. " +
  "For each entry { day: D, notVisited: [...] }, you MUST move those POIs only to days with day number > D. " +
  "You MUST reinsert EVERY not visited POI ID somewhere in days 1..N; do NOT drop any and do NOT invent new POI IDs. " +
  "Days that are NOT mentioned in the notVisited list should remain as close as possible to the original " +
  "(same places and similar themes), except for possibly inserting a few missed POIs from earlier days. " +
  "When choosing where to place missed POIs, try to keep each day geographically and thematically coherent " +
  "(prefer days in the same area or side of the city when possible).";

    const userPrompt = `
Trip configuration:
- City: ${tripConfig.city}
- Days: ${tripConfig.numberOfDays}
- Traveler type: ${tripConfig.travelerType}
- Mobility: ${tripConfig.mobilityPreference}
- Pace: ${tripConfig.pace}
- Optimization: ${tripConfig.optimizationType}

Current itinerary (with POIs and days):
${JSON.stringify(itinerary, null, 2)}

Not visited POIs per day (by id):
${JSON.stringify(notVisitedByDay, null, 2)}


Task:
Rebuild the itinerary days (1..N), keeping as much of the original structure as possible.
Only days that appear in "Not visited POIs per day" should be treated as partially failed days.
For all other days, keep their list of places and themes as close as possible to the original,
only inserting missed POIs from earlier days when it makes sense.
Every not visited POI ID must appear at least once in the new days[].places arrays.
If a POI was not visited on day D, do NOT keep it on day D: move it only to days with day number > D.
Prefer to place it on later days in the same area / side of the city and with similar themes when possible.


Output JSON:
{
  "days": [
    {
      "day": 1,
      "theme": "string",
      "places": ["poi-id-1","poi-id-2"],
      "description": "max 4 sentences",
      "restaurant": {
        "name": "string",
        "cuisine": "string",
        "address": "string",
        "priceRange": "$ | $$ | $$$"
      }
    }
  ]
}

Return only the JSON.
`;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4.1-mini",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        response_format: { type: "json_object" },
      }),
    });

    const data = await response.json();
console.log("updateNextDays raw response:", data);

if (!response.ok) {
  console.error("API error in updateNextDays:", data);
  throw new Error(`API error: ${response.status}`);
}

const raw = data.choices?.[0]?.message?.content;
if (!raw) throw new Error("No content from model");

const cleaned = cleanJson(raw);
console.log("updateNextDays cleaned JSON:", cleaned);

const updated = JSON.parse(cleaned) as { days: DayItinerary[] };


    // ✅ ora sostituiamo TUTTI i giorni con la versione aggiornata
    setItinerary({
      pois: itinerary.pois,
      days: updated.days,
    });
  } catch (err) {
    console.error(err);
    alert("Error updating itinerary. Check console.");
  } finally {
    setUpdating(false);
  }
};

// Calculate total duration (visit + transfers)
function estimateDayDuration(day: DayItinerary, poiList: Poi[]): number {
  let totalMinutes = 0;

  day.places.forEach((id, i) => {
    const poi = poiList.find((p) => p.id === id);
    if (!poi) return;

    const timeForVisit =
      estimatedVisitTimeByCategory[poi.category] ||
      estimatedVisitTimeByCategory.default;

    totalMinutes += timeForVisit;

    if (i < day.places.length - 1) totalMinutes += 20; // transfer time
  });

  return totalMinutes;
}

// Intensity label (English)
function getIntensityLabel(minutes: number): string {
  if (minutes < 240) return "Light";       // <4h
  if (minutes < 420) return "Moderate";    // <7h
  return "Intense";                        // >7h
}

type FakeWeather = {
  icon: string;
  label: string;
};

function getFakeWeatherForDay(day: DayItinerary, city: string): FakeWeather {
  // pattern finti ciclici
  const patterns: FakeWeather[] = [
    { icon: "☀️", label: "Sunny and warm, perfect for walking" },
    { icon: "🌤", label: "Mild and partly sunny, comfortable day outside" },
    { icon: "⛅️", label: "Mixed clouds and sun, light breeze" },
    { icon: "🌧", label: "Light showers possible, good mix of indoor & outdoor plans" },
  ];

  const index = (day.day - 1) % patterns.length;
  const base = patterns[index];

  return {
    icon: base.icon,
    label: `Weather in ${city}: ${base.label}`,
  };
}


  return (
    <div
      className="app-root"
      style={{
        backgroundImage: "linear-gradient(180deg, #f4d6b5, #fffcf5, #d9e9ff)",
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundAttachment: "fixed",
        backdropFilter: "blur(2px)",
      }}
    >
      <div className="app-container">

{step === 1 && (
  <section className="home-hero">
    <div className="home-hero-content">
      <div className="home-hero-icons">
        <span className="home-hero-icon">✈️</span>
        <span className="home-hero-icon">🗺️</span>
        <span className="home-hero-icon">🏛️</span>
      </div>

      <div className="home-hero-text">
  <h2>Where are you traveling next?</h2>
  <p>Tell us your city, pace and travel style — we'll build <strong>a travel plan that evolves with your journey.</strong></p>
  <ul className="hero-highlights">
    <li>✨ No static itineraries — fully adaptive based on real progress</li>
    <li>🚶 Smart route optimised by area, distance & energy</li>
    <li>🔁 Ideal for both first-time and return visits</li>
  </ul>
</div>
    </div>
  </section>
)}


        {step === 1 && (
          <section className="card">
            <h2>Step 1 – Trip details</h2>
            <div className="form-grid">
              <label>
                <strong>City</strong>
                <input
                  type="text"
                  value={tripConfig.city}
                  onChange={(e) => handleTripConfigChange("city", e.target.value)}
                />
              </label>

              <label>
                <strong>Number of days</strong>
                <input
                  type="number"
                  min={1}
                  max={7}
                  value={tripConfig.numberOfDays}
                  onChange={(e) =>
                    handleTripConfigChange("numberOfDays", Number(e.target.value))
                  }
                />
              </label>

              <label>
                <strong>Traveler type</strong>
                <select
                  value={tripConfig.travelerType}
                  onChange={(e) =>
                    handleTripConfigChange("travelerType", e.target.value)
                  }
                >
                  <option value="solo">solo</option>
                  <option value="couple">couple</option>
                  <option value="friends">friends</option>
                  <option value="family">family</option>
                  <option value="with baby">with baby</option>
                  <option value="with children">with children</option>
                  <option value="with elderly">with elderly</option>
                  <option value="mobility-impaired">mobility-impaired</option>
                </select>
              </label>

              <label>
                <strong>Mobility preference</strong>
                <select
                  value={tripConfig.mobilityPreference}
                  onChange={(e) =>
                    handleTripConfigChange("mobilityPreference", e.target.value)
                  }
                >
                  <option value="walking">walking</option>
                  <option value="public transport">public transport</option>
                  <option value="car/taxi">car/taxi</option>
                </select>
              </label>

              <label>
                <strong>Pace</strong>
                <select
                  value={tripConfig.pace}
                  onChange={(e) => handleTripConfigChange("pace", e.target.value)}
                >
                  <option value="slow">slow</option>
                  <option value="medium">medium</option>
                  <option value="intense">intense</option>
                </select>
              </label>

              <label>
                <strong>Optimization</strong>
                <select
                  value={tripConfig.optimizationType}
                  onChange={(e) =>
                    handleTripConfigChange("optimizationType", e.target.value)
                  }
                >
                  <option value="distance-based">distance-based</option>
                  <option value="theme-based">theme-based</option>
                </select>
              </label>
            </div>

            <div className="card-actions">
              <button onClick={() => setStep(2)}>Next: select visited places</button>
            </div>
          </section>
        )}

        {step === 2 && (
  <section className="card">
    <h2>
      Step 2 – Places you have already visited{" "}
      {hasDefinedPoi ? `(${tripConfig.city})` : ""}
    </h2>

    {hasDefinedPoi ? (
      <>
        <p className="hint">
          Tick the places in {tripConfig.city} that you have visited before.
          They will be excluded from the new itinerary.
        </p>
        <div className="poi-list">
          {poiSourceForCity.map((poi) => (
            <label key={poi.id} className="poi-item">
              <input
                type="checkbox"
                checked={visitedPoiIds.includes(poi.id)}
                onChange={() => toggleVisitedPoi(poi.id)}
              />
              <div>
                <div className="poi-name">{poi.name}</div>
                <div className="poi-meta">
                  <span className="poi-tag poi-location">
                    {poi.neighborhood}
                  </span>
                  <span className="poi-tag poi-category">
                    {poi.category}
                  </span>
                </div>
              </div>
            </label>
          ))}
        </div>
      </>
    ) : (
      <>
        <p className="hint">
          For {cityName}, we don’t have a predefined list of visited places yet.
          Just click “Generate itinerary” and the AI will suggest POIs
          automatically.
        </p>
      </>
    )}

    <div className="card-actions">
      <button onClick={() => setStep(1)}>Back</button>
      <button onClick={generateItinerary} disabled={loading}>
        {loading ? "Generating..." : "Generate itinerary"}
      </button>
    </div>
  </section>
)}


        {step === 3 && itinerary && (
          <section className="card">
            <h2>Step 3 - Your itinerary</h2>

<header
  className="app-hero"
  style={{ backgroundImage: `url('${heroImage}')` }}
>
  {heroImageLoading && (
    <div className="hero-loading">
      <div className="hero-spinner" />
      <span>Generating city image…</span>
    </div>
  )}

  <div className="app-hero-content">
    <div className="app-hero-title">{tripConfig.city}</div>
    <div className="app-hero-subtitle">
      Your smart itinerary is ready ✨
    </div>
  </div>
</header>

{/* 👇 SPOSTATA QUI (e con stile più grande) */}
<p className="hint highlight-hint">
  💡 For each day, tick the POIs you actually visited. Then, at the bottom of the page,
  press <strong>"Update itinerary with missed places"</strong> to reshuffle
  missed stops into later days, based on the parameters you selected.
</p>


      <div className="day-list">
  {(itinerary.days || []).map((day, dayIndex) => {
    const visitedForThisDay = visitedByDay[day.day] || [];
    const allVisited =
      day.places.length > 0 &&
      day.places.every((id) => visitedForThisDay.includes(id));

    return (
      <div key={day.day} className="day-card">
        <div className="day-header">
          <div>
            <h3>
              Day {day.day} - {day.theme}
            </h3>
            <p>{day.description}</p>

            {(() => {
              const minutes = estimateDayDuration(
                day,
                itinerary.pois || getPoiSource(tripConfig.city)
              );
              const hours = Math.floor(minutes / 60);
              const mins = minutes % 60;
              const intensity = getIntensityLabel(minutes);

              return (
                <p>
                  🕒 {hours}h {mins}m • <strong>{intensity}</strong>
                </p>
              );
            })()}

            {(() => {
              const weather = getFakeWeatherForDay(day, tripConfig.city);
              return (
                <p>
                  {weather.icon} {weather.label}
                </p>
              );
            })()}
          </div>

          <a
            href={buildMapUrlForDay(day)}
            target="_blank"
            rel="noopener noreferrer"
            className="map-link"
          >
            View on map
          </a>
        </div>

        {day.restaurant && (
          <div className="restaurant-box">
            🍽️ <strong>{day.restaurant.name}</strong> <br />
            <small>
              {day.restaurant.cuisine} • {day.restaurant.priceRange} <br />
              📍 {day.restaurant.address}
            </small>
          </div>
        )}

        {/* 👇 QUI compare il checkbox "select all" */}
        <div className="day-select-all">
          <label>
            <input
              type="checkbox"
              checked={allVisited}
              onChange={() =>
                setVisitedByDay((prev) => {
                  const current = prev[day.day] || [];

                  let updated: string[];
                  if (allVisited) {
                    // era tutto spuntato → deseleziono tutti i POI del giorno
                    updated = current.filter(
                      (id) => !day.places.includes(id)
                    );
                  } else {
                    // non era tutto spuntato → aggiungo tutti i POI del giorno
                    const set = new Set([...current, ...day.places]);
                    updated = Array.from(set);
                  }

                  return {
                    ...prev,
                    [day.day]: updated,
                  };
                })
              }
            />
            <span>Mark all as visited</span>
          </label>
        </div>

        <div className="poi-list">
          {day.places.map((id, poiIndex) => {
            const poi = getPoiById(id);
            if (!poi) return null;

            return (
              <div
                key={id}
                className="poi-item"
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(dayIndex, poiIndex)}
              >
                <button
                  type="button"
                  className="drag-handle"
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.effectAllowed = "move";
                    handleDragStart(dayIndex, poiIndex);
                  }}
                  aria-label="Reorder place"
                >
                  <span>≡</span>
                </button>

                <input
                  type="checkbox"
                  checked={visitedForThisDay.includes(id)}
                  onChange={() =>
                    setVisitedByDay((prev) => {
                      const current = prev[day.day] || [];
                      const updated = current.includes(id)
                        ? current.filter((x) => x !== id)
                        : [...current, id];

                      return {
                        ...prev,
                        [day.day]: updated,
                      };
                    })
                  }
                />

                <div>
                  <div className="poi-name">{poi.name}</div>
                  <div className="poi-meta">
                    {poi.neighborhood} • {poi.category}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  })}
</div>



<div className="update-actions">
  <button onClick={updateNextDays} disabled={updating}>
    {updating ? "Updating..." : "Update itinerary with missed places"}
  </button>
  <p className="hint">
    Missed places will be rearranged based on your travel preferences.
  </p>
</div>


            <div className="card-actions">
              <button onClick={() => setStep(2)}>Back to visited selection</button>
              <button onClick={() => setStep(1)}>Start new trip</button>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
