import { useState } from 'react'
import { Upload, FileImage, Trash2, Download, CheckCircle, AlertTriangle, ChevronDown, ChevronUp } from 'lucide-react'

// ─── Config ───────────────────────────────────────────────────────────────────
const LARAVEL_DETECT_URL = '/api/classify'

// ─── Disease / Pest knowledge base (sourced from IRRI, PhilRice, DA research) ─
const DISEASE_DB = {
  bacterial_leaf_blight: {
    condition: 'Bacterial Leaf Blight',
    causalAgent: 'Xanthomonas oryzae pv. oryzae',
    keySymptoms: [
      'Water-soaked pale green stripes at leaf margins or tips',
      'Lesions expand, turning yellow to grayish-white with wavy margins',
      'Opaque yellowish dew beads (bacterial ooze) visible in early morning',
      'Kresek phase: rapid wilting and desiccation of young seedling leaves',
    ],
    environmentalRisk:
        'Favored by temperatures 25–34°C, high relative humidity, cloudy conditions for 5+ consecutive days, windy conditions causing leaf injuries, and excessive nitrogen fertilization (>60 kg/ha).',
    recommendations: [
      'Plant resistant varieties: NSIC Rc142 or Rc154 — primary line of defense',
      'Balanced NPK fertilization; withhold further nitrogen when symptoms appear',
      'Keep water levels low; do not move irrigation water from infected fields',
      'Pull out diseased plants and drain field to reduce humidity',
      'Plow under infected stubbles and straw after harvest to break pathogen lifecycle',
    ],
    ipmNote:
        'PhilRice and DA emphasize that chemical control is generally neither economical nor effective — preventive cultural practices under the PalayCheck system are the foundation of BLB management.',
  },
  brown_spot: {
    condition: 'Brown Spot',
    causalAgent: 'Bipolaris oryzae',
    keySymptoms: [
      'Numerous small, circular dark brown to purple-brown lesions on leaves',
      'Fully developed lesions: light brown/gray center with reddish-brown margin',
      'Infects grain causing "pecky rice" — discoloration and poor milling quality',
      'Can affect all aboveground plant parts including glumes',
    ],
    environmentalRisk:
        'Associated with unflooded, nutrient-deficient soils — particularly lacking silicon, nitrogen, or potassium — and soils where toxic iron accumulates.',
    recommendations: [
      'Soil remediation: regular nutrient monitoring and balanced fertilizer application',
      'Seed treatment: hot water soak at 53–54°C for 10–12 minutes before planting',
      'Fungicide seed treatment with Propiconazole or Iprodione if disease pressure is high',
      'Correct silicon, nitrogen, and potassium deficiencies as a primary intervention',
      'Maintain proper flooding in irrigated fields to reduce soil toxicity',
    ],
    ipmNote:
        'IRRI and PhilRice treat Brown Spot as a bio-indicator of poor soil health — correcting nutrient deficiency is more effective and economical than fungicide application alone.',
  },
  leaf_blast: {
    condition: 'Leaf Blast',
    causalAgent: 'Magnaporthe oryzae',
    keySymptoms: [
      'Small white to gray-green spots with dark green borders initially',
      'Lesions enlarge into diamond/spindle shapes: grayish-white center, reddish-brown border',
      'Multiple lesions coalesce — entire leaf dies giving the field a scorched appearance',
      'Most severe at seedling stage; plants may develop resistance as they mature',
    ],
    environmentalRisk:
        'Favored by humidity >90%, long dew periods, and cool night temperatures (optimal sporulation at 25–28°C). Soils with low moisture and high nitrogen are particularly vulnerable.',
    recommendations: [
      'Plant resistant varieties — the primary and most cost-effective control measure',
      'Apply calcium silicate slag or disease-free rice straw to strengthen plant cell walls',
      'Split nitrogen fertilization into 2+ applications to avoid susceptible tissue flushes',
      'Maintain continuous flooding to limit blast development and reduce nitrate availability',
      'Fungicide: Tricyclazole, Azoxystrobin, or Triazoles (e.g., Nativo) when necessary',
    ],
    ipmNote:
        'DA-PhilRice and IRRI emphasize rotating resistant varieties each season due to the high variability of M. oryzae populations — no single cultivar remains effective indefinitely.',
  },
  neck_blast: {
    condition: 'Neck Blast',
    causalAgent: 'Magnaporthe oryzae',
    keySymptoms: [
      'Grayish-brown rot girdles the neck node just below the panicle',
      'Panicle falls over or stem snaps at the infected neck node',
      'Infection before milky stage: entire panicle stays white and unfilled (blanking)',
      'Later infections: poor grain filling and significantly reduced milling quality',
    ],
    environmentalRisk:
        'Same conditions as Leaf Blast — humidity >90%, extended dew periods, and cool nights. Infection at the heading stage is the most catastrophic scenario.',
    recommendations: [
      'Apply systemic fungicide at early heading stage — this is the CRITICAL application window',
      'Use Tricyclazole, Azoxystrobin, or Nativo; missing this window leads to near-total panicle loss',
      'Plant resistant varieties and rotate cultivars each season to prevent pathogen adaptation',
      'Avoid excess nitrogen at reproductive stage; use fractionated N application',
      'Distinguish from stem borer: blast panicles cannot be easily pulled from leaf sheath',
    ],
    ipmNote:
        'PhilRice classifies Neck Blast as the most injurious form of the disease. Fungicide application at panicle exertion is strongly recommended even for partially resistant varieties in endemic areas.',
  },
  leaf_scald: {
    condition: 'Leaf Scald',
    causalAgent: 'Microdochium oryzae',
    keySymptoms: [
      'Zonate lesions of alternating light tan and dark brown bands on mature leaves',
      'Lesions typically start at leaf tips or edges',
      'Large leaf areas affected, giving the plant a scorched or "scalded" appearance',
      'In severe cases may cause root rot or head blight resulting in sterility',
    ],
    environmentalRisk:
        'Highly favored by wet weather, high nitrogen fertilization, and close plant spacing. Typically occurs on mature leaves late in the season.',
    recommendations: [
      'Use resistant varieties where available as the primary cultural control',
      'Split nitrogen application — avoid heavy N doses especially late in the season',
      'Widen plant spacing to improve air circulation and reduce canopy humidity',
      'Sanitation: remove weed hosts and plow under rice stubble after harvest',
      'Seed treatment with Benomyl or Carbendazim for seedborne inoculum reduction',
    ],
    ipmNote:
        'IRRI recommends Leaf Scald management primarily through cultural practices — resistant varieties, sanitation, and proper spacing — with fungicides as a secondary option when pressure is high.',
  },
  narrow_brown_leaf_spot: {
    condition: 'Narrow Brown Leaf Spot',
    causalAgent: 'Cercospora janseana',
    keySymptoms: [
      'Short, linear brown lesions running parallel to leaf veins (2–10 mm long, 1–1.5 mm wide)',
      'Lesions occur on leaves, sheaths, and glumes',
      'Appears during late growth stages: panicle initiation to maturity',
      'Severe cases lead to premature leaf death and plant lodging',
    ],
    environmentalRisk:
        'Favored by potassium-deficient soils. Typically a late-season disease from heading to maturity that intensifies under high humidity.',
    recommendations: [
      'Ensure adequate potassium fertilization — the primary preventive measure',
      'Conduct soil testing and correct K deficiency before planting',
      'Plant resistant varieties where available',
      'Spray Propiconazole at booting to heading stages if infection pressure is severe',
      'Field sanitation: plow under infected stubbles and straw post-harvest',
    ],
    ipmNote:
        'IRRI considers Narrow Brown Leaf Spot a minor disease and bio-indicator of potassium deficiency. PhilRice recommends soil testing and correcting K deficiency as the most cost-effective first intervention.',
  },
  sheath_blight: {
    condition: 'Sheath Blight',
    causalAgent: 'Rhizoctonia solani',
    keySymptoms: [
      'Greenish-gray oval or elongated spots on sheaths near the water line initially',
      'Lesions enlarge: grayish-white center with dark brown or purplish margin',
      'Spreads upward and laterally through canopy contact between infected and healthy tissue',
      'Severe infection reaching the flag leaf hinders panicle exertion',
    ],
    environmentalRisk:
        'A major disease in high-input agriculture. Sclerotia survive in soil, float on water surface, and initiate infection via sheath contact. Dense plantings create a humid microclimate that accelerates spread.',
    recommendations: [
      'Reduce plant density and use PalayCheck-recommended spacing for better air circulation',
      'Drain field for a few days at maximum tillering stage to interrupt the infection cycle',
      'Deep plow after harvest to bury infected stubble; expose soil to intense sunlight',
      'Fungicide: Validamycin or Hexaconazole targeted at sheaths and lower leaves',
      'Avoid excessive nitrogen which promotes dense, humid canopy conditions',
    ],
    ipmNote:
        'DA-PhilRice notes Sheath Blight has emerged as a major disease in high-input farming areas. The PalayCheck System recommends optimum seeding rates and timely field drainage as the primary management tools.',
  },
  tungro: {
    condition: 'Tungro',
    causalAgent: 'RTBV + RTSV (vector: Green Leafhopper, Nephotettix virescens)',
    keySymptoms: [
      'Stunted growth and significantly reduced number of tillers',
      'Young leaves show mottling; older leaves turn yellow to yellow-orange',
      'Yellowing progresses from leaf tips downward',
      'Field pattern: sporadic clusters initially, then uniform spread if unmanaged',
    ],
    environmentalRisk:
        'Vector-borne disease. Green Leafhopper populations surge with asynchronous planting, continuous rice culture, and warm humid conditions that allow uninterrupted host availability.',
    recommendations: [
      'Community-wide synchronous planting within a short time window — the most critical intervention',
      'Maintain a one-month fallow period to break the Green Leafhopper lifecycle',
      'Rotate between resistant varieties each season to prevent vector or viral population adaptation',
      'Early detection: inspect weekly, rogue infected plants, and plow under severe early infections',
      'Control leafhopper vector if it reaches economic threshold levels',
    ],
    ipmNote:
        'IRRI and PhilRice emphasize that Tungro requires community-based management — individual farm action alone is insufficient. Synchronous planting across entire barangays or municipalities is the most effective known strategy.',
  },
  rice_hispa: {
    condition: 'Rice Hispa',
    causalAgent: 'Dicladispa armigera',
    keySymptoms: [
      'Adult scraping: white streaks parallel to midrib where only lower epidermis remains',
      'Larval mining: irregular translucent white patches running parallel to leaf veins',
      'Severe infestations cause leaf withering and a burnt field appearance',
      'Adult beetles are small (~4 mm), bluish-black with short spines on the body',
    ],
    environmentalRisk:
        'Common in rainfed and irrigated wetland environments. Populations increase with excessive nitrogen fertilization and during warm, wet seasons with dense plantings.',
    recommendations: [
      'Clip shoot tips of seedlings before transplanting — reduces grub population by 20–40%',
      'Manual collection of adults using sweeping nets during early infestation',
      'Avoid over-fertilization with nitrogen which attracts and sustains the pest population',
      'Delay insecticide application to conserve natural enemies (parasitoid wasps, reduviid bugs)',
      'Apply insecticide (Malathion, Chlorpyrifos, or Quinalphos) only when threshold is reached: 1 adult or 1–2 damaged leaves per hill',
    ],
    ipmNote:
        'IRRI recommends biological control as the first-line response — parasitoid wasps and reduviid bugs are effective natural enemies. Insecticides should only be used at the economic threshold as they disrupt beneficial insect populations.',
  },
  healthy: {
    condition: 'Healthy Rice Plant',
    causalAgent: 'No pathogen detected',
    keySymptoms: [
      'Uniform vibrant green coloration — Leaf Color Chart reading of 4 or higher',
      'Smooth leaf surface free of bacterial ooze, lesions, or larval mines',
      'Intact leaf margins with no splitting, curling, or necrosis',
      'High near-infrared (NIR) spectral reflectance in the 700–850 nm range',
    ],
    environmentalRisk:
        'Healthy plants result from balanced nutrient management, proper water management, use of certified seeds, and favorable environmental conditions without prolonged humidity or disease pressure.',
    recommendations: [
      'Continue balanced NPK fertilization using the Leaf Color Chart as a guide',
      'Maintain proper water management — consistent flooding in irrigated systems',
      'Practice field sanitation: remove weed hosts and crop debris regularly',
      'Monitor weekly for early signs of disease or pest activity for timely intervention',
      'Use certified seeds and maintain synchronous planting with neighboring farms',
    ],
    ipmNote:
        'PhilRice PalayCheck: a healthy plant is the result of integrated practices — quality seeds, proper nutrition, water management, and preventive monitoring. Continue current practices and stay vigilant throughout the growing season.',
  },
}

// Normalize class name from API to DB key
const normalizeClass = (cls = '') =>
    cls.toLowerCase().replace(/\s+/g, '_').replace(/[^a-z_]/g, '')

// ─── Severity badge colours ───────────────────────────────────────────────────
const severityColor = s => ({
  low:      'bg-green-500/20  border-green-500/30  text-green-300',
  medium:   'bg-yellow-500/20 border-yellow-500/30 text-yellow-300',
  high:     'bg-orange-500/20 border-orange-500/30 text-orange-300',
  critical: 'bg-red-500/20    border-red-500/30    text-red-300',
})[s?.toLowerCase()] ?? 'bg-white/10 border-white/20 text-white/50'

const typeColor = t => t === 'Pest'
    ? 'bg-purple-500/20 border-purple-500/30 text-purple-300'
    : 'bg-blue-500/20   border-blue-500/30   text-blue-300'

// ─── Single detection card ────────────────────────────────────────────────────
function DetectionCard({ det, index }) {
  const [open, setOpen] = useState(index === 0)

  // Look up disease details instantly from the embedded DB
  const info = DISEASE_DB[normalizeClass(det.class)] ?? null

  return (
      <div className="border border-white/10 rounded-xl overflow-hidden">
        {/* Card header */}
        <button
            onClick={() => setOpen(o => !o)}
            className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/5 transition-colors text-left"
        >
          <div className="flex items-center gap-3 min-w-0">
            <CheckCircle size={15} className="text-green-400 flex-shrink-0" />
            <span className="text-sm font-semibold text-white truncate">
            {info?.condition ?? det.class}
          </span>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
            <span className="text-xs font-semibold text-white/40">{det.confidence}%</span>
            <span className={`px-2 py-0.5 border text-xs font-semibold rounded-full ${severityColor(det.severity)}`}>
            {det.severity}
          </span>
            <span className={`px-2 py-0.5 border text-xs font-semibold rounded-full ${typeColor(det.type)}`}>
            {det.type}
          </span>
            {open
                ? <ChevronUp size={14} className="text-white/30" />
                : <ChevronDown size={14} className="text-white/30" />}
          </div>
        </button>

        {/* Expanded details */}
        {open && (
            <div className="px-4 pb-4 border-t border-white/10 pt-3 space-y-3">
              {!info ? (
                  <p className="text-xs text-white/40 italic">No detailed information available for this class.</p>
              ) : (
                  <>
                    {/* Causal agent */}
                    <p className="text-xs text-white/35 italic">{info.causalAgent}</p>

                    {/* Key Symptoms */}
                    <div>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Key Symptoms</p>
                      <ul className="space-y-1">
                        {info.keySymptoms.map((s, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-white/55">
                              <span className="w-1 h-1 rounded-full bg-yellow-400 flex-shrink-0 mt-1.5" />
                              {s}
                            </li>
                        ))}
                      </ul>
                    </div>

                    {/* Environmental Risk */}
                    <div className="bg-white/5 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-white/35 uppercase tracking-wider mb-1">Environmental Risk</p>
                      <p className="text-xs text-white/55">{info.environmentalRisk}</p>
                    </div>

                    {/* Recommendations */}
                    <div>
                      <p className="text-xs font-semibold text-white/40 uppercase tracking-wider mb-1.5">Recommendations</p>
                      <ul className="space-y-1.5">
                        {info.recommendations.map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-xs text-white/70">
                              <span className="w-1 h-1 rounded-full bg-green-400 flex-shrink-0 mt-1.5" />
                              {r}
                            </li>
                        ))}
                      </ul>
                    </div>

                    {/* IPM Note */}
                    <div className="bg-green-500/10 border border-green-500/20 rounded-lg px-3 py-2">
                      <p className="text-xs font-semibold text-green-400 uppercase tracking-wider mb-1">IPM / PhilRice</p>
                      <p className="text-xs text-white/55">{info.ipmNote}</p>
                    </div>
                  </>
              )}
            </div>
        )}
      </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function Detection() {
  const [uploadedImage, setUploadedImage] = useState(null)
  const [isDragging, setIsDragging]       = useState(false)
  const [isDetecting, setIsDetecting]     = useState(false)
  const [detections, setDetections]       = useState(null)
  const [rawResult, setRawResult]         = useState(null)
  const [error, setError]                 = useState(null)

  const handleDragOver  = e => { e.preventDefault(); setIsDragging(true) }
  const handleDragLeave = () => setIsDragging(false)
  const handleDrop      = e => {
    e.preventDefault(); setIsDragging(false)
    const file = e.dataTransfer.files[0]
    if (file?.type.startsWith('image/')) handleImageUpload(file)
  }
  const handleFileSelect = e => {
    if (e.target.files[0]) handleImageUpload(e.target.files[0])
  }

  const handleImageUpload = file => {
    const reader = new FileReader()
    reader.onload = e => {
      setUploadedImage(e.target.result)
      const base64 = e.target.result.split(',')[1]
      runDetection(base64)
    }
    reader.readAsDataURL(file)
  }

  const runDetection = async (base64) => {
    setIsDetecting(true)
    setDetections(null)
    setRawResult(null)
    setError(null)

    try {
      const res = await fetch(LARAVEL_DETECT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          // 'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]')?.content ?? '',
        },
        body: JSON.stringify({ image: base64 })
      })

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}))
        throw new Error(errBody.message || errBody.error || `HTTP ${res.status}`)
      }

      const data = await res.json()
      setRawResult(data)

      const saved = data.saved ?? []
      setDetections(saved.length === 0 ? [] : saved)

    } catch (e) {
      setError(e.message || 'Detection failed. Is the Python service running on port 5000?')
    } finally {
      setIsDetecting(false)
    }
  }

  const handleClear = () => {
    setUploadedImage(null)
    setDetections(null)
    setRawResult(null)
    setError(null)
  }

  const handleDownload = () => {
    if (!rawResult) return
    const blob = new Blob([JSON.stringify(rawResult, null, 2)], { type: 'application/json' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = 'detection-results.json'
    a.click()
  }

  return (
      <div className="min-h-screen bg-white">
        <main className="max-w-screen-2xl mx-auto px-4 sm:px-4 lg:px-8 xl:px-12 py-2 lg:py-8 flex flex-col gap-10 font-sans text-[#262626]">

          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
            <div>
              <p className="text-xs font-semibold tracking-widest text-green-600 uppercase mb-1">Detection</p>
              <h1 className="text-3xl font-bold tracking-tight text-[#262626]">Image Detection</h1>
              <p className="text-sm text-[rgba(38,38,38,0.45)] mt-0.5">Upload a crop image to analyze pests or diseases</p>
            </div>
            {uploadedImage && (
                <div className="flex gap-2">
                  <button onClick={handleClear}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-white border border-[#26262610] text-sm font-semibold text-[rgba(38,38,38,0.65)] rounded-xl hover:bg-[#26262604] hover:border-[#26262615] transition-all">
                    <Trash2 size={14} /> Clear
                  </button>
                  {rawResult && (
                      <button onClick={handleDownload}
                              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#262626] text-white text-sm font-semibold rounded-xl hover:bg-[#1f1f1f] active:scale-95 transition-all">
                        <Download size={14} /> Download
                      </button>
                  )}
                </div>
            )}
          </div>

          <div className="h-px w-full bg-[#26262608]" />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">

            {/* ── Upload ── */}
            <section className="w-full">
              <div className="flex items-end justify-between gap-4 py-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#262626]">Upload Image</h2>
                  <p className="text-xs font-medium text-[rgba(38,38,38,0.45)] mt-1">PNG or JPG up to 10MB</p>
                </div>
              </div>
              <div className="h-px w-full bg-[#26262608]" />
              <div className="py-6">
                <div
                    onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                    className={`border-2 border-dashed rounded-2xl transition-all ${
                        isDragging
                            ? 'border-green-400 bg-green-50/50'
                            : 'border-[#26262615] bg-[#26262604] hover:border-[#26262625]'
                    }`}
                >
                  {uploadedImage ? (
                      <img src={uploadedImage} alt="Uploaded" className="w-full max-h-80 object-contain rounded-xl" />
                  ) : (
                      <label className="cursor-pointer block py-16 text-center">
                        <div className="w-12 h-12 rounded-2xl bg-[#26262608] flex items-center justify-center mx-auto mb-4">
                          <Upload size={20} className="text-[rgba(38,38,38,0.35)]" />
                        </div>
                        <p className="text-sm font-semibold text-[rgba(38,38,38,0.7)] mb-1">Drop image here or click to upload</p>
                        <p className="text-xs text-[rgba(38,38,38,0.35)]">JPG, PNG, WebP supported</p>
                        <input type="file" accept="image/*" onChange={handleFileSelect} className="hidden" />
                      </label>
                  )}
                </div>
              </div>
            </section>

            {/* ── Results ── */}
            <section className="w-full">
              <div className="flex items-end justify-between gap-4 py-4">
                <div>
                  <h2 className="text-sm font-bold tracking-tight text-[#262626]">Detection Results</h2>
                  <p className="text-xs font-medium text-[rgba(38,38,38,0.45)] mt-1">
                    {detections
                        ? `${detections.length} detection${detections.length !== 1 ? 's' : ''} found`
                        : 'Analysis output and recommendations'}
                  </p>
                </div>
              </div>
              <div className="h-px w-full bg-[#26262608]" />
              <div className="py-6">
                <div className="bg-[#0b0b0b] rounded-2xl min-h-64 flex items-start justify-center p-6">

                  {isDetecting ? (
                      <div className="text-center my-auto w-full">
                        <div className="w-10 h-10 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                        <p className="text-[rgba(255,255,255,0.7)] text-sm font-medium">Running best.pt model…</p>
                        <p className="text-[rgba(255,255,255,0.3)] text-xs mt-1">Sending to Python service on :5000</p>
                      </div>

                  ) : error ? (
                      <div className="text-center my-auto w-full">
                        <div className="w-12 h-12 rounded-2xl bg-red-500/10 flex items-center justify-center mx-auto mb-3">
                          <AlertTriangle size={20} className="text-red-400" />
                        </div>
                        <p className="text-red-400 text-sm font-semibold mb-1">Detection failed</p>
                        <p className="text-white/30 text-xs">{error}</p>
                      </div>

                  ) : detections !== null && detections.length === 0 ? (
                      <div className="text-center my-auto w-full">
                        <div className="w-12 h-12 rounded-2xl bg-green-500/10 flex items-center justify-center mx-auto mb-3">
                          <CheckCircle size={20} className="text-green-400" />
                        </div>
                        <p className="text-green-400 text-sm font-semibold">No diseases or pests detected</p>
                        <p className="text-white/30 text-xs mt-1">Rice plant appears healthy</p>
                      </div>

                  ) : detections !== null ? (
                      <div className="w-full space-y-3">
                        {detections.map((det, i) => (
                            <DetectionCard key={det.id ?? i} det={det} index={i} />
                        ))}
                      </div>

                  ) : (
                      <div className="text-center my-auto w-full">
                        <div className="w-12 h-12 rounded-2xl bg-white/5 flex items-center justify-center mx-auto mb-3">
                          <FileImage size={20} className="text-white/30" />
                        </div>
                        <p className="text-white/45 text-sm">Upload an image to see results</p>
                      </div>
                  )}
                </div>
              </div>
            </section>

          </div>
        </main>
      </div>
  )
}