import { useState, useCallback, useRef } from "react"

const DISEASE_DB = {
    bacterial_leaf_blight: {
        label: "Bacterial Leaf Blight",
        causal: "Xanthomonas oryzae pv. oryzae",
        type: "Bacterial",
        severity: "High",
        color: "#c0392b",
        bg: "#fdf2f0",
        border: "#e8b4ae",
        icon: "🦠",
        symptoms: [
            "Water-soaked pale green stripes at leaf margins or tips",
            "Lesions expand, turning yellow to grayish-white with wavy margins",
            "Opaque yellowish dew beads (bacterial ooze) visible in early morning",
            "Kresek phase: rapid wilting and desiccation of young seedling leaves"
        ],
        environmental: "Favored by temperatures 25–34°C, high humidity, cloudy conditions for 5+ consecutive days, windy conditions causing leaf injuries, and excessive nitrogen (>60 kg/ha).",
        treatments: [
            "Plant resistant varieties: NSIC Rc142, Rc154 — primary defense",
            "Balanced NPK fertilization; avoid excess nitrogen application",
            "Keep water levels low; do not move water from infected to clean fields",
            "Pull out diseased plants; drain field to reduce humidity",
            "Plow under infected stubbles and straw after harvest",
            "Remove weed hosts and rice ratoons to eliminate inoculum"
        ],
        ipm: "PhilRice emphasizes that chemical control is generally neither economical nor effective — preventive cultural practices are the foundation of BLB management under the PalayCheck system.",
        yield_loss: "20–50%",
        endemic: "Bicol, CARAGA, Central Luzon"
    },
    brown_spot: {
        label: "Brown Spot",
        causal: "Bipolaris oryzae",
        type: "Fungal",
        severity: "Medium",
        color: "#8b5e3c",
        bg: "#faf4ef",
        border: "#d4a98a",
        icon: "🍂",
        symptoms: [
            "Numerous small, circular dark brown to purple-brown lesions on leaves",
            "Fully developed lesions: light brown/gray center with reddish-brown margin",
            "Infects grain causing 'pecky rice' — discoloration and poor milling quality",
            "Affects all aboveground plant parts"
        ],
        environmental: "Associated with unflooded, nutrient-deficient soils — particularly lacking silicon, nitrogen, or potassium. Also occurs in soils with toxic iron accumulation.",
        treatments: [
            "Soil remediation: regular nutrient monitoring and balanced fertilizer application",
            "Seed treatment: hot water soak at 53–54°C for 10–12 minutes",
            "Fungicide seed treatment: Propiconazole or Iprodione",
            "Correct silicon, nitrogen, and potassium deficiencies",
            "Maintain proper flooding in irrigated fields",
            "Use certified healthy seeds from reliable sources"
        ],
        ipm: "Brown Spot is a bio-indicator of soil health. IRRI and PhilRice recommend soil remediation as the first line of action — treating the cause (nutrient deficiency) rather than the symptom.",
        yield_loss: "Up to 45% (historically linked to the 1943 Bengal Famine)",
        endemic: "Nutrient-poor upland and rainfed areas nationwide"
    },
    leaf_blast: {
        label: "Leaf Blast",
        causal: "Magnaporthe oryzae",
        type: "Fungal",
        severity: "High",
        color: "#6c5ce7",
        bg: "#f3f1fd",
        border: "#b8afe8",
        icon: "💨",
        symptoms: [
            "Small white to gray-green spots with dark green borders initially",
            "Lesions enlarge into diamond/spindle shapes: grayish-white center, reddish-brown border",
            "Multiple lesions coalesce — entire leaf dies giving field a scorched appearance",
            "Most severe at seedling stage; plants develop resistance as they mature"
        ],
        environmental: "Favored by humidity >90%, long dew periods, cool night temperatures (optimal sporulation at 25–28°C), soils with low moisture and high nitrogen.",
        treatments: [
            "Plant resistant varieties — primary and most effective control",
            "Apply calcium silicate slag or use disease-free rice straw to strengthen cell walls",
            "Split nitrogen fertilization into 2+ applications to prevent susceptible tissue flush",
            "Maintain continuous flooding to limit blast development and reduce nitrate availability",
            "Fungicide: Tricyclazole, Azoxystrobin, or Triazoles (e.g., Nativo) when necessary",
            "Avoid drought stress which predisposes plants to infection"
        ],
        ipm: "DA-PhilRice and IRRI emphasize rotating resistant varieties due to the high variability of M. oryzae populations — no single cultivar remains resistant indefinitely.",
        yield_loss: "Up to 80% in susceptible varieties during epidemics",
        endemic: "Upland and irrigated systems nationwide, especially during cool wet seasons"
    },
    neck_blast: {
        label: "Neck Blast",
        causal: "Magnaporthe oryzae",
        type: "Fungal",
        severity: "Critical",
        color: "#d63031",
        bg: "#fdf0f0",
        border: "#e8aaaa",
        icon: "⚠️",
        symptoms: [
            "Grayish-brown rot girdles the neck node just below the panicle",
            "Panicle falls over or stem snaps at the infected node",
            "If infected before milky stage: entire panicle stays white and unfilled (blanking)",
            "Later infections: poor grain filling, reduced milling quality"
        ],
        environmental: "Same conditions as Leaf Blast — humidity >90%, dew periods, and cool nights. Infection at heading stage is catastrophic.",
        treatments: [
            "Apply systemic fungicides at early heading stage — Tricyclazole, Azoxystrobin, Nativo",
            "This is the CRITICAL application window; missing it leads to near-total panicle loss",
            "Plant resistant varieties; rotate cultivars each season",
            "Fractionated nitrogen application — avoid excess N at heading",
            "Distinguish from stem borer: blast panicles cannot be easily pulled from sheath",
            "Maintain continuous flooding during reproductive stage"
        ],
        ipm: "PhilRice classifies Neck Blast as the most injurious form of the disease. Fungicide application at the panicle exertion stage is strongly recommended even for partially resistant varieties in endemic areas.",
        yield_loss: "Up to 100% of panicle in early infections",
        endemic: "All rice ecosystems; highest risk in cool, humid highland and rainfed areas"
    },
    leaf_scald: {
        label: "Leaf Scald",
        causal: "Microdochium oryzae",
        type: "Fungal",
        severity: "Medium",
        color: "#e17055",
        bg: "#fdf3f0",
        border: "#e8b8a8",
        icon: "🔥",
        symptoms: [
            "Zonate lesions of alternating light tan and dark brown bands",
            "Lesions typically start at leaf tips or edges",
            "Can cover large leaf areas giving scorched/'scalded' appearance",
            "May cause root rot or head blight resulting in sterility in severe cases"
        ],
        environmental: "Highly favored by wet weather, high nitrogen fertilization, and close plant spacing. Occurs on mature leaves late in the season.",
        treatments: [
            "Use resistant varieties where available",
            "Split nitrogen application — avoid heavy N doses especially late season",
            "Widen plant spacing to improve air circulation and reduce humidity",
            "Sanitation: remove weed hosts, plow under rice stubble post-harvest",
            "Seed treatment with Benomyl or Carbendazim",
            "Expose soil to intense sunlight through deep plowing after harvest"
        ],
        ipm: "IRRI recommends Leaf Scald management primarily through cultural practices — resistant varieties, sanitation, and proper spacing — with fungicides as a secondary option.",
        yield_loss: "Generally moderate; severe in dense plantings under wet conditions",
        endemic: "Rainfed and irrigated lowland areas with dense canopies"
    },
    narrow_brown_leaf_spot: {
        label: "Narrow Brown Leaf Spot",
        causal: "Cercospora janseana",
        type: "Fungal",
        severity: "Low",
        color: "#b7950b",
        bg: "#fdf9ec",
        border: "#e8d89a",
        icon: "📏",
        symptoms: [
            "Short, linear brown lesions running parallel to leaf veins (2–10mm long, 1–1.5mm wide)",
            "Lesions occur on leaves, sheaths, and glumes",
            "Appears during late growth stages: panicle initiation to maturity",
            "Severe cases: premature leaf death and plant lodging"
        ],
        environmental: "Favored by potassium-deficient soils. Typically a late-season disease from heading to maturity.",
        treatments: [
            "Ensure adequate potassium fertilization — primary preventive measure",
            "Plant resistant varieties",
            "Spray Propiconazole at booting to heading stages if infection is severe",
            "Maintain soil health with regular nutrient monitoring",
            "Use certified seeds to avoid seedborne inoculum",
            "Field sanitation: plow under infected stubbles post-harvest"
        ],
        ipm: "IRRI considers Narrow Brown Leaf Spot a minor disease and bio-indicator of potassium deficiency. PhilRice recommends soil testing and correcting K deficiency as the most cost-effective intervention.",
        yield_loss: "Generally minor; can be significant in severe potassium-deficient conditions",
        endemic: "Potassium-deficient soils across all rice ecosystems"
    },
    sheath_blight: {
        label: "Sheath Blight",
        causal: "Rhizoctonia solani",
        type: "Fungal",
        severity: "High",
        color: "#00b894",
        bg: "#f0fdf8",
        border: "#9ee8d2",
        icon: "🌿",
        symptoms: [
            "Greenish-gray oval or elongated spots on sheaths near the water line",
            "Lesions enlarge: grayish-white center with dark brown or purplish margin",
            "Spreads upward and laterally through canopy contact",
            "Severe infection reaching flag leaf hinders panicle exertion"
        ],
        environmental: "Favored by high-input cultivation with dense planting, high humidity microclimate from closed canopy. Sclerotia survive in soil and float to infect sheaths.",
        treatments: [
            "Reduce plant density; use PalayCheck recommended spacing for better air circulation",
            "Drain field for a few days at maximum tillering to interrupt infection cycle",
            "Deep plow after harvest to bury infected stubble; expose soil to sunlight",
            "Fungicide: Validamycin or Hexaconazole targeting sheaths and lower leaves",
            "Avoid excessive nitrogen which promotes dense, humid canopy",
            "Remove and destroy infected plant material"
        ],
        ipm: "DA-PhilRice notes Sheath Blight has emerged as a major disease in high-input agriculture areas. The PalayCheck System recommends optimum seeding rates and field drainage as the primary management tools.",
        yield_loss: "20–50% in high-input, dense planting systems",
        endemic: "Irrigated lowland, especially in high-input areas of Central Luzon and Iloilo"
    },
    tungro: {
        label: "Tungro",
        causal: "RTBV + RTSV (vector: Green Leafhopper)",
        type: "Viral",
        severity: "Critical",
        color: "#0984e3",
        bg: "#f0f6fe",
        border: "#9ec8f0",
        icon: "🦟",
        symptoms: [
            "Stunted growth and reduced number of tillers",
            "Young leaves show mottling; older leaves turn yellow to yellow-orange",
            "Yellowing progresses from leaf tips downward",
            "Field pattern: sporadic clusters initially, then uniform spread if unmanaged"
        ],
        environmental: "Vector-borne disease; Green Leafhopper (Nephotettix virescens) populations increase with asynchronous planting, continuous rice culture, and warm humid conditions.",
        treatments: [
            "Community-wide synchronous planting within a short time window — critical intervention",
            "Maintain one-month fallow period to break Green Leafhopper lifecycle",
            "Alternate between resistant varieties each season to prevent vector adaptation",
            "Early detection: inspect field regularly, plow under severely affected early infections",
            "Rogue out infected plants during primary infection phase",
            "Control leafhopper vector if economic threshold exceeded"
        ],
        ipm: "IRRI and PhilRice emphasize that Tungro requires community-based management. Individual farm action alone is insufficient — synchronous planting across entire barangays/municipalities is the most effective strategy.",
        yield_loss: "Up to 100% in susceptible varieties during severe outbreaks",
        endemic: "Endemic in Western Visayas, Central Luzon, and other major rice growing regions"
    },
    rice_hispa: {
        label: "Rice Hispa",
        causal: "Dicladispa armigera",
        type: "Pest",
        severity: "Medium",
        color: "#a855f7",
        bg: "#f8f2fe",
        border: "#d4aaee",
        icon: "🪲",
        symptoms: [
            "Adult scraping: white streaks parallel to midrib (only lower epidermis remains)",
            "Larval mining: irregular translucent white patches parallel to veins",
            "Severe infestations: leaves wither, field appears burnt",
            "Adult beetles are bluish-black, ~4mm, with short spines on body"
        ],
        environmental: "Common in rainfed and irrigated wetland environments. Populations increase with excessive nitrogen fertilization and during warm wet seasons.",
        treatments: [
            "Clip shoot tips of seedlings before transplanting — reduces grub population by 20–40%",
            "Manual collection of adults using sweeping nets in the field",
            "Avoid over-fertilization with nitrogen which attracts and sustains the pest",
            "Delay insecticide sprays to conserve natural enemies (parasitoid wasps, reduviid bugs)",
            "Chemical threshold: 1 adult or 1–2 damaged leaves per hill before insecticide use",
            "If needed: Malathion, Chlorpyrifos, or Quinalphos as last resort only"
        ],
        ipm: "IRRI recommends biological control as the first-line response — parasitoid wasps and reduviid bugs are effective natural enemies. Insecticides should only be used when the economic threshold is reached, as they disrupt natural enemy populations.",
        yield_loss: "Up to 20%",
        endemic: "South and Southeast Asia; widespread in Philippine rainfed wetland areas"
    },
    healthy: {
        label: "Healthy Rice Plant",
        causal: "No pathogen detected",
        type: "Healthy",
        severity: "None",
        color: "#27ae60",
        bg: "#f0fdf4",
        border: "#9ee8b8",
        icon: "✅",
        symptoms: [
            "Uniform vibrant green coloration — Leaf Color Chart reading of 4 or higher",
            "Smooth leaf surface free of bacterial ooze, lesions, or mines",
            "Intact margins with no splitting, curling, or necrosis",
            "High near-infrared (NIR) spectral reflectance (700–850 nm range)"
        ],
        environmental: "Healthy plants result from balanced nutrient management, proper water management, certified seeds, and favorable environmental conditions without prolonged humidity or disease pressure.",
        treatments: [
            "Continue balanced NPK fertilization using the Leaf Color Chart as guide",
            "Maintain proper water management — consistent flooding in irrigated systems",
            "Practice field sanitation: remove weed hosts and debris",
            "Monitor weekly for early signs of disease or pest activity",
            "Use certified seeds for next cropping season",
            "Maintain synchronous planting with neighboring farms"
        ],
        ipm: "PhilRice PalayCheck System: a healthy plant is the result of integrated practices — high-quality seeds, proper nutrition, water management, and preventive pest monitoring. Continue current practices and maintain vigilance.",
        yield_loss: "None",
        endemic: "Well-managed fields with good soil health and cultural practices"
    }
}

const CLASSES = Object.keys(DISEASE_DB)

const TYPE_COLORS = {
    Bacterial: { bg: "#fff0f0", text: "#c0392b", border: "#e8aaaa" },
    Fungal:    { bg: "#f3f1fd", text: "#6c5ce7", border: "#b8afe8" },
    Viral:     { bg: "#f0f6fe", text: "#0984e3", border: "#9ec8f0" },
    Pest:      { bg: "#f8f2fe", text: "#a855f7", border: "#d4aaee" },
    Healthy:   { bg: "#f0fdf4", text: "#27ae60", border: "#9ee8b8" }
}

const SEV_COLORS = {
    None:     { bg: "#f0fdf4", text: "#27ae60" },
    Low:      { bg: "#fefce8", text: "#b7950b" },
    Medium:   { bg: "#fff7ed", text: "#e17055" },
    High:     { bg: "#fdf2f0", text: "#c0392b" },
    Critical: { bg: "#fdf0f0", text: "#d63031" }
}

function buildPrompt(base64Image) {
    const classList = CLASSES.map(c => `"${c}"`).join(", ")
    return `You are an expert rice plant pathologist. Analyze this rice plant image carefully.

Classify the image into EXACTLY ONE of these classes:
${classList}

Respond ONLY with a valid JSON object (no markdown, no backticks, no explanation):
{
  "class": "exact_class_name_from_list",
  "confidence": 92,
  "reasoning": "Brief 1-2 sentence visual reasoning for why you chose this class"
}`
}

export default function RiceClassifier() {
    const [image, setImage] = useState(null)
    const [imageData, setImageData] = useState(null)
    const [result, setResult] = useState(null)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState(null)
    const [dragging, setDragging] = useState(false)
    const [activeTab, setActiveTab] = useState("symptoms")
    const fileRef = useRef()

    const processFile = useCallback((file) => {
        if (!file?.type.startsWith("image/")) return
        const reader = new FileReader()
        reader.onload = (e) => {
            setImage(e.target.result)
            setResult(null)
            setError(null)
            const base64 = e.target.result.split(",")[1]
            setImageData(base64)
        }
        reader.readAsDataURL(file)
    }, [])

    const classify = async () => {
        if (!imageData) return
        setLoading(true)
        setError(null)
        setResult(null)
        try {
            const res = await fetch("https://api.anthropic.com/v1/messages", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    model: "claude-sonnet-4-20250514",
                    max_tokens: 1000,
                    messages: [{
                        role: "user",
                        content: [
                            {
                                type: "image",
                                source: { type: "base64", media_type: "image/jpeg", data: imageData }
                            },
                            { type: "text", text: buildPrompt(imageData) }
                        ]
                    }]
                })
            })
            const data = await res.json()
            const text = data.content?.map(i => i.text || "").join("") || ""
            const clean = text.replace(/```json|```/g, "").trim()
            const parsed = JSON.parse(clean)
            const classKey = parsed.class?.toLowerCase().replace(/\s+/g, "_")
            const disease = DISEASE_DB[classKey] || DISEASE_DB[parsed.class] || null
            setResult({ ...parsed, classKey, disease })
            setActiveTab("symptoms")
        } catch (e) {
            setError("Classification failed. Please try again.")
        } finally {
            setLoading(false)
        }
    }

    const reset = () => {
        setImage(null)
        setImageData(null)
        setResult(null)
        setError(null)
    }

    const disease = result?.disease
    const typeC = disease ? TYPE_COLORS[disease.type] : null
    const sevC = disease ? SEV_COLORS[disease.severity] : null

    const tabs = [
        { id: "symptoms", label: "Symptoms" },
        { id: "environment", label: "Risk Factors" },
        { id: "treatment", label: "Treatment" },
        { id: "ipm", label: "IPM / PhilRice" }
    ]

    return (
        <div style={{ fontFamily: "var(--font-sans)", maxWidth: 700, margin: "0 auto", padding: "1.5rem 0" }}>
            <h2 className="sr-only">Rice disease image classifier</h2>

            {/* Header */}
            <div style={{ marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
                    <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#27ae60" }} />
                    <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", letterSpacing: "0.08em", textTransform: "uppercase" }}>PhilRice / IRRI / DA Guidelines</span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>Rice Disease Classifier</h1>
                <p style={{ fontSize: 14, color: "var(--color-text-secondary)", margin: "4px 0 0" }}>Upload a rice plant image to detect diseases and pests</p>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: image ? "1fr 1fr" : "1fr", gap: 16, marginBottom: 16 }}>

                {/* Upload zone */}
                <div>
                    <div
                        onClick={() => !image && fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); setDragging(true) }}
                        onDragLeave={() => setDragging(false)}
                        onDrop={e => { e.preventDefault(); setDragging(false); processFile(e.dataTransfer.files[0]) }}
                        style={{
                            border: `1.5px dashed ${dragging ? "#27ae60" : "var(--color-border-secondary)"}`,
                            borderRadius: "var(--border-radius-lg)",
                            background: dragging ? "#f0fdf4" : "var(--color-background-secondary)",
                            overflow: "hidden",
                            cursor: image ? "default" : "pointer",
                            transition: "all 0.15s",
                            minHeight: 200,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center"
                        }}
                    >
                        {image ? (
                            <img src={image} alt="Uploaded rice plant" style={{ width: "100%", maxHeight: 260, objectFit: "contain", display: "block" }} />
                        ) : (
                            <div style={{ textAlign: "center", padding: "2rem 1rem" }}>
                                <i className="ti ti-photo-up" style={{ fontSize: 32, color: "var(--color-text-tertiary)", display: "block", marginBottom: 10 }} aria-hidden="true" />
                                <p style={{ fontSize: 14, fontWeight: 500, color: "var(--color-text-secondary)", margin: "0 0 4px" }}>Drop image or click to upload</p>
                                <p style={{ fontSize: 12, color: "var(--color-text-tertiary)", margin: 0 }}>JPG, PNG, WebP — rice plant photos</p>
                            </div>
                        )}
                    </div>
                    <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={e => processFile(e.target.files[0])} />

                    {image && (
                        <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                            <button
                                onClick={classify}
                                disabled={loading}
                                style={{
                                    flex: 1, padding: "9px 16px", borderRadius: "var(--border-radius-md)",
                                    background: loading ? "var(--color-background-secondary)" : "#27ae60",
                                    color: loading ? "var(--color-text-tertiary)" : "#fff",
                                    border: "none", fontSize: 14, fontWeight: 500, cursor: loading ? "not-allowed" : "pointer",
                                    display: "flex", alignItems: "center", justifyContent: "center", gap: 8, transition: "all 0.15s"
                                }}
                            >
                                {loading ? (
                                    <>
                                        <span style={{ width: 14, height: 14, border: "2px solid #27ae60", borderTopColor: "transparent", borderRadius: "50%", display: "inline-block", animation: "spin 0.8s linear infinite" }} />
                                        Analyzing…
                                    </>
                                ) : (
                                    <><i className="ti ti-microscope" aria-hidden="true" /> Classify Image</>
                                )}
                            </button>
                            <button
                                onClick={reset}
                                style={{
                                    padding: "9px 14px", borderRadius: "var(--border-radius-md)",
                                    background: "transparent", border: "0.5px solid var(--color-border-secondary)",
                                    color: "var(--color-text-secondary)", fontSize: 14, cursor: "pointer"
                                }}
                            >
                                <i className="ti ti-trash" aria-hidden="true" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Quick class legend when no image */}
                {!image && (
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                        {Object.values(DISEASE_DB).map(d => (
                            <div key={d.label} style={{
                                background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)",
                                border: "0.5px solid var(--color-border-tertiary)", padding: "10px 12px",
                                display: "flex", alignItems: "center", gap: 8
                            }}>
                                <span style={{ fontSize: 16 }}>{d.icon}</span>
                                <div>
                                    <p style={{ fontSize: 12, fontWeight: 500, color: "var(--color-text-primary)", margin: 0, lineHeight: 1.3 }}>{d.label}</p>
                                    <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0 }}>{d.type}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Result panel */}
                {image && (result || loading || error) && (
                    <div>
                        {loading && (
                            <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", padding: "2rem", textAlign: "center", height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
                                <div style={{ width: 40, height: 40, border: "3px solid #27ae60", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.8s linear infinite", marginBottom: 16 }} />
                                <p style={{ color: "var(--color-text-secondary)", fontSize: 14, margin: 0 }}>Analyzing image with Claude…</p>
                                <p style={{ color: "var(--color-text-tertiary)", fontSize: 12, margin: "4px 0 0" }}>Checking 10 disease/pest classes</p>
                            </div>
                        )}

                        {error && (
                            <div style={{ background: "var(--color-background-danger)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-danger)", padding: "1.5rem", textAlign: "center" }}>
                                <i className="ti ti-alert-circle" style={{ fontSize: 28, color: "var(--color-text-danger)", display: "block", marginBottom: 8 }} aria-hidden="true" />
                                <p style={{ color: "var(--color-text-danger)", fontSize: 14, fontWeight: 500, margin: "0 0 4px" }}>Classification failed</p>
                                <p style={{ color: "var(--color-text-secondary)", fontSize: 12, margin: 0 }}>{error}</p>
                            </div>
                        )}

                        {result && disease && (
                            <div style={{ background: "var(--color-background-primary)", borderRadius: "var(--border-radius-lg)", border: "0.5px solid var(--color-border-tertiary)", overflow: "hidden" }}>
                                {/* Result header */}
                                <div style={{ background: disease.bg, borderBottom: `1px solid ${disease.border}`, padding: "16px 20px" }}>
                                    <div style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
                                        <span style={{ fontSize: 28, lineHeight: 1 }}>{disease.icon}</span>
                                        <div style={{ flex: 1 }}>
                                            <h2 style={{ fontSize: 16, fontWeight: 500, color: disease.color, margin: "0 0 2px" }}>{disease.label}</h2>
                                            <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "0 0 10px", fontStyle: "italic" }}>{disease.causal}</p>
                                            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                                                {typeC && (
                                                    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: typeC.bg, color: typeC.text, border: `0.5px solid ${typeC.border}` }}>
                            {disease.type}
                          </span>
                                                )}
                                                {sevC && (
                                                    <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: sevC.bg, color: sevC.text, border: "0.5px solid currentColor" }}>
                            Severity: {disease.severity}
                          </span>
                                                )}
                                                <span style={{ fontSize: 11, fontWeight: 500, padding: "3px 10px", borderRadius: 20, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", border: "0.5px solid var(--color-border-tertiary)" }}>
                          {result.confidence}% confidence
                        </span>
                                            </div>
                                        </div>
                                    </div>
                                    {result.reasoning && (
                                        <p style={{ fontSize: 12, color: "var(--color-text-secondary)", margin: "12px 0 0", background: "rgba(255,255,255,0.6)", padding: "8px 12px", borderRadius: "var(--border-radius-md)", lineHeight: 1.5 }}>
                                            <i className="ti ti-quote" style={{ marginRight: 6, fontSize: 13 }} aria-hidden="true" />
                                            {result.reasoning}
                                        </p>
                                    )}
                                </div>

                                {/* Stats row */}
                                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0, borderBottom: "0.5px solid var(--color-border-tertiary)" }}>
                                    <div style={{ padding: "10px 20px", borderRight: "0.5px solid var(--color-border-tertiary)" }}>
                                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Yield loss</p>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{disease.yield_loss}</p>
                                    </div>
                                    <div style={{ padding: "10px 20px" }}>
                                        <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: "0 0 2px", textTransform: "uppercase", letterSpacing: "0.05em" }}>Endemic areas</p>
                                        <p style={{ fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 }}>{disease.endemic}</p>
                                    </div>
                                </div>

                                {/* Tabs */}
                                <div style={{ display: "flex", borderBottom: "0.5px solid var(--color-border-tertiary)", overflowX: "auto" }}>
                                    {tabs.map(t => (
                                        <button key={t.id} onClick={() => setActiveTab(t.id)} style={{
                                            padding: "10px 16px", fontSize: 12, fontWeight: 500, border: "none", cursor: "pointer",
                                            background: "transparent", whiteSpace: "nowrap",
                                            color: activeTab === t.id ? disease.color : "var(--color-text-secondary)",
                                            borderBottom: activeTab === t.id ? `2px solid ${disease.color}` : "2px solid transparent",
                                            transition: "all 0.15s"
                                        }}>
                                            {t.label}
                                        </button>
                                    ))}
                                </div>

                                {/* Tab content */}
                                <div style={{ padding: "16px 20px" }}>
                                    {activeTab === "symptoms" && (
                                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                            {disease.symptoms.map((s, i) => (
                                                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                                                    <span style={{ width: 6, height: 6, borderRadius: "50%", background: disease.color, flexShrink: 0, marginTop: 5 }} />
                                                    {s}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {activeTab === "environment" && (
                                        <div style={{ background: "var(--color-background-secondary)", borderRadius: "var(--border-radius-md)", padding: "14px 16px" }}>
                                            <p style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, margin: 0 }}>{disease.environmental}</p>
                                        </div>
                                    )}
                                    {activeTab === "treatment" && (
                                        <ul style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                                            {disease.treatments.map((t, i) => (
                                                <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 10, fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.5 }}>
                                                    <i className="ti ti-check" style={{ fontSize: 14, color: "#27ae60", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                                                    {t}
                                                </li>
                                            ))}
                                        </ul>
                                    )}
                                    {activeTab === "ipm" && (
                                        <div style={{ background: "#f0fdf4", borderRadius: "var(--border-radius-md)", border: "0.5px solid #9ee8b8", padding: "14px 16px" }}>
                                            <div style={{ display: "flex", gap: 10, marginBottom: 8 }}>
                                                <i className="ti ti-leaf" style={{ fontSize: 16, color: "#27ae60", flexShrink: 0, marginTop: 1 }} aria-hidden="true" />
                                                <p style={{ fontSize: 11, fontWeight: 500, color: "#27ae60", margin: 0, textTransform: "uppercase", letterSpacing: "0.06em" }}>IRRI / PhilRice / DA-PalayCheck guidance</p>
                                            </div>
                                            <p style={{ fontSize: 13, color: "var(--color-text-primary)", lineHeight: 1.6, margin: 0 }}>{disease.ipm}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Footer note */}
            <p style={{ fontSize: 11, color: "var(--color-text-tertiary)", margin: 0, textAlign: "center" }}>
                Classification based on IRRI, PhilRice, and DA guidelines · Verify findings with a field agronomist
            </p>

            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        </div>
    )
}