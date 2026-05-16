# Analyse og komplet Codex-input til en moderne webapp for Tesla Custom Light Show

## Konklusion

Den rigtige måde at bygge dette på er **ikke** at prøve at genskabe xLights i browseren, men at bygge en webapp med én **kanonisk intern show-model** og to outputs: et **realistisk 3D-preview** i browseren og en **Tesla-kompatibel eksport** som ZIP med `README.md` i ZIP-roden og en `LightShow/`-mappe med en `.fseq` og en lydfil med **samme basename**. Tesla’s egen guide siger, at custom shows køres fra en base-level `LightShow`-mappe, at showet ligger i en `.fseq`, at lyd kan være `.mp3` eller `.wav`, at filnavnene skal matche, og at samme show kan deles på tværs af understøttede Tesla-modeller, fordi showet ikke er modelspecifikt. Tesla anbefaler desuden `.wav` og kræver i praksis 44,1 kHz for korrekt sync. citeturn35view1turn35view2turn7view1

Jeg anbefaler en arkitektur med **Next.js App Router** som frontend/BFF, en **Python/FastAPI**-backend til upload, analyse og eksport, og en **worker/queue** til tunge jobs som YouTube-import, FFmpeg-normalisering og FSEQ-generering. Det passer godt til, at Next.js route handlers er gode som request handlers, mens FastAPI har førsteklasses understøttelse af `UploadFile`, multipart-requests og WebSockets, og at audioanalyse samt `yt-dlp`-integration er mest naturlig i Python. Til jobkørsel er en egentlig task queue den robuste vej for længerevarende media-jobs. citeturn40view0turn40view1turn40view2turn40view3turn34search0turn34search15turn18view1turn18view2

Det vigtigste produktvalg er at lave **lights-only v1** og først gøre closures til fase to. Tesla dokumenterer, at closures har aktueringsgrænser pr. show, termiske begrænsninger og relativt lange bevægelsestider, så en auto-generator, der “danser” døre og vinduer på beat, bliver hurtigt både upålidelig og use-case-mæssigt dårlig. En god v1 bør derfor fokusere på lyskanaler, præcis synkronisering, realistisk per-model preview og korrekt eksport. citeturn38view0turn39view0

YouTube-import kan godt designes teknisk, men det er den største **forretningsmæssige og juridiske risiko** i hele projektet. YouTube’s generelle Terms siger, at man ikke må downloade eller på anden måde bruge content ud over det, tjenesten specifikt tillader, medmindre man har skriftlig tilladelse eller lovhjemmel. YouTube’s API-regler går endnu længere og forbyder udtrykkeligt at tilbyde downloads, at separere lyd fra video og at tilbyde audio-only udtræk via YouTube API-baserede flows. Derfor bør du beskrive funktionen som **“import af brugerautoriseret lyd fra YouTube-URL”**, beskytte den bag en feature-flag, kræve en eksplicit “jeg har rettighederne”-bekræftelse og være meget forsigtig med at gøre den til et offentligt SaaS-feature. citeturn12view0turn14search0turn14search2

## Krav og begrænsninger fra Tesla som appen skal bygges omkring

Tesla’s officielle guide er nok præcis til, at du kan definere hårde eksportkrav. Et custom show skal ligge på et USB-drev i en base-level mappe kaldet `LightShow`, og mappen skal mindst indeholde en `.fseq` og en `.mp3` eller `.wav`, hvor **basenavnet matcher**. Tesla siger også, at flere shows kan ligge på samme USB, at showet ikke er model-specifikt, og at understøttede biler omfatter Model S 2021+, Model 3, Model X 2021+, Model Y og Cybertruck. citeturn35view1turn35view2

Audio-siden er lige så vigtig for eksporten. Tesla’s dokumentation siger, at både MP3 og WAV kan bruges, men at **WAV anbefales**, og at lydfilen skal være kodet med **44,1 kHz**, fordi mindre almindelige 48 kHz-filer ikke synker korrekt til light showet. Af samme grund bør appen internt normalisere alt input til en kanonisk **44,1 kHz WAV-master**, selv hvis brugeren uploader MP3 eller i sidste ende vælger MP3 som eksportformat. Default-eksporten bør være WAV, ikke MP3. citeturn7view1

Tesla’s egen arbejdsgang med xLights giver også de vigtigste tekniske signaler til en custom generator. De anbefaler **20 ms frame interval**, selv om bilen understøtter 15–100 ms, og de kræver i deres guide, at xLights gemmer som **FSEQ V2 Uncompressed**. Tesla’s validator checker blandt andet for `PSEQ`-magic, headerstørrelse mindst 24 bytes, mindst én frame, `step_time >= 15`, præcis **48 eller 200 kanaler**, og at `compression_type == 0`, altså V2 Uncompressed. Validatoren advarer desuden, hvis versionen ikke er 2.0 eller 2.2. Det er den klareste officielle reference til, hvordan din egen FSEQ-writer skal opføre sig. citeturn37view0turn6view0

Der er flere model- og regionsafvigelser, som previewet skal afspejle, hvis det skal føles rigtigt. Tesla dokumenterer, at ikke alle biler har alle lygter, at nogle kanaler OR-mappes sammen på bestemte modeller, at side markers kun findes i Nordamerika, at rear fog findes på non-North-America-biler og North America Model X, og at Model 3/Y har særlige regler for Channels 4–6. Tesla anbefaler direkte, at man bruger lygter, som findes på alle varianter, når man vil lave platform-agnostiske shows. Det er et stærkt argument for, at auto-generatoren bør have et **cross-vehicle safe mode** som standard og først bruge mere nicheprægede lygter som valgfri stilprofiler. citeturn38view0turn37view0

Det samme gælder previewet. Tesla’s xLights-projekt bruger en **Model S + Cybertruck superset-preview** for at dække alle understøttede køretøjer, men dokumentationen viser samtidig separate kanal-lokationer for Model 3/Y med både reflector- og projector-lamper, Model S med reflector og projector, Model X og Cybertruck. Derfor skal din webapp **ikke** bare vise én generisk “Tesla”-mesh med tilfældige lys; den skal have separate preview-profiler eller separate modeller for de relevante biltyper og lampetyper. citeturn37view0turn38view0

## Anbefalet arkitektur og datamodel

Jeg anbefaler en repo-struktur med en **webapp**, en **API/worker-service** og et lille **shared kontraktlag**. Webdelen håndterer UI, 3D-preview og timeline. Backend håndterer upload, YouTube-import, audioanalyse, FSEQ-writing og ZIP-streaming. Det er en bevidst opdeling: Next.js route handlers er glimrende som moderne request handlers i `app/`, men tunge media-jobs passer bedre i en backend, der er bygget til filhåndtering, workers og native værktøjer. FastAPI understøtter både `UploadFile`, multipart med `File` og `Form`, og WebSockets til progress events, mens en task queue passer til jobs, der skal ud af request/response-cyklussen. citeturn40view0turn40view1turn40view2turn40view3turn34search0turn34search15

Den interne datamodel bør have én **kanonisk showrepræsentation**, for eksempel `ShowTimeline`, som består af frames i 20 ms-grid, hvor hver frame bærer kanalværdier og metadata om afledte audiofeatures. Det afgørende er, at **samme timeline** både driver browser-previewet og FSEQ-eksporten. Når samme datakilde ligger under begge outputs, undgår du det klassiske problem, hvor preview “ser rigtigt ud”, men den genererede `.fseq` spiller anderledes i bilen. Tesla’s eget formatkrav om 20 ms anbefalet grid og delbare, ikke-modelspecifikke shows støtter netop denne strategi. citeturn35view2turn37view0turn6view0

Audio-pipelinen bør være enkel og deterministisk: modtag MP3/WAV eller en YouTube-URL, brug FFmpeg til at normalisere til en intern **stereo 44,1 kHz WAV-master**, analyser derefter den normaliserede WAV med `librosa`, og gem både rå audiofeature-serier og det afledte show. FFmpeg er bygget til mediekonvertering og resampling, og `librosa` dokumenterer beat tracking, onset strength og rhythm features, som er præcis de signaler, du har brug for til lysmønstre, strobes, ramps og section changes. citeturn10search0turn10search2turn28search0turn28search16turn28search10turn29search5

Til selve auto-genereringen bør du instruere Codex til at lave en **regelbaseret generator først** og kun gøre den “AI-smart” bagefter. Det bedste første design er typisk: beat/onset styrer flashes og accent-lys, low-band energy styrer kraftige grupper, high-band energy styrer hurtige detaljer, og mere vedvarende sektioner styrer ramps. Fordi Tesla dokumenterer, at mange kanaler er boolean eller kun støtter bestemte ramp-profiler, og at ikke alle lygter findes på alle biler, er en strikt regelmotor med modelbevidste constraints den sikreste v1. Senere kan du lægge et LLM-lag ovenpå, som vælger en stilprofil eller en koreografisk “scene plan”, men den bør stadig skrive til den samme deterministiske timeline-model. citeturn39view0turn38view0turn37view0

YouTube-import bør teknisk implementeres i Python-workerlaget med `yt_dlp.YoutubeDL`, ikke som et browserhack. `yt-dlp` dokumenterer både `--extract-audio` og `--audio-format` med støtte for blandt andet MP3 og WAV, og projektet viser også et Python-eksempel med `FFmpegExtractAudio`. Hvis du vælger at implementere dette, så gør det bag en env-flag som `ENABLE_YOUTUBE_IMPORT=true`, valider at URL’en er `youtube.com` eller `youtu.be`, kræv en rettighedsbekræftelse og gem revision logs. Men vær ærlig i produktet om, at denne funktion kan være i konflikt med YouTube’s Terms, især hvis den gøres generelt tilgængelig som offentligt download/convert-feature. citeturn18view1turn18view2turn18view3turn12view0turn14search0turn14search2

## Preview, synkronisering og realistisk Tesla-simulering

Previewet skal bygges som en **rigtig 3D-simulator**, ikke som en 2D-waveform med blinkende prikker. Brug React Three Fiber til scene- og komponentmodellen og Three.js’ `GLTFLoader` til at loade GLB/gltf-modeller. glTF er et åbent format, og det gør det praktisk at arbejde med separate modeller, emissive materials og lys-anchors. React Three Fiber er specifikt lavet som React-abstraktion oven på Three.js. citeturn40view4turn40view5

Det kritiske designvalg er at separere **bilmesh** fra **lysrig**. Hver model bør have en `lightAnchors.json` eller navngivne empties i GLB’en, hvor hvert logisk Tesla-lys sidder i korrekt fysisk position. Browseren skal derefter mappe din `ShowTimeline` til modelens specifikke lygteudstyr. Det er vigtigt, fordi Tesla dokumenterer både forskellige lampetyper pr. model og OR-mapping/regional forskel for enkelte lys. Hvis du springer dette over, ser previewet “cool” ud, men det bliver ikke troværdigt for en bruger, der kender sin egen bil. citeturn38view0turn37view0

Til synkronisering bør previewets “clock” komme fra **Web Audio API**, ikke fra `setInterval`. `BaseAudioContext.currentTime` er lavet til scheduling og visualisering, og `AnalyserNode` kan bruges til realtime frekvens- og tidsdomænedata. Jeg ville derfor loade den normaliserede preview-audio i browseren, start/stoppe via audio context, og lade både timeline playhead, waveform og 3D-animator læse af samme clock. For en moderne timeline er `wavesurfer.js` et godt valg, fordi biblioteket har officielle plugins til både waveform, timeline og regions. citeturn9search15turn36search0turn36search15turn9search0turn9search2

Et realistisk preview kræver også, at du simulerer **kanaltyperne rigtigt**. Tesla dokumenterer, at de fleste lyskanaler er boolean, at visse kanaler støtter bestemte ramp-profiler, og at nogle Cybertruck-kanaler har ægte full-brightness control. De siger også, at på biler uden full-brightness control bliver værdier over 50 % reelt bare ON og ellers OFF. Previewet skal derfor kende kanaltypen og bilen: et 0–255 frame-array må ikke blindt vises som lineær brightness på alle modeller. citeturn39view0turn37view0

Hvis du vil have previewet til at føles “Tesla-rigtigt” for en dansk bruger, bør default bilprofilen være **EU-variant**, og UI’et bør tilbyde valg af mindst disse presets: Model 3/Y reflector, Model 3/Y projector, Model S reflector, Model S projector, Model X og Cybertruck. Det følger direkte af Tesla’s egne kanal-lokationsdiagrammer og region-noter om side markers og rear fog. citeturn38view0

## Komplet Codex-input du kan bruge direkte

OpenAI’s egne Codex-anbefalinger er meget klare: gode resultater kommer af at give Codex et tydeligt **goal**, relevant **context**, faste **constraints** og et præcist **done when**. For større opgaver anbefaler de også at få Codex til at **planlægge først**, bruge **AGENTS.md** til permanente instruktioner og gemme specifikation/plan/status i filer, så agenten har en stabil definition af “færdig”. citeturn20view0turn20view1turn20view2turn19search1

Brug først denne `AGENTS.md` i repo-roden:

```md
# AGENTS.md

## Repository expectations

- Use TypeScript in the web app and Python 3.11+ in the API/worker.
- Keep the architecture split into:
  - apps/web
  - services/api
  - packages/shared
- Never hardcode Tesla channel order from memory or blogs. Derive and document channel mappings from Tesla's official light-show project assets and validator.
- Prefer deterministic pipelines over “magic AI” behavior.
- Default export audio format must be WAV unless the user explicitly chooses MP3.
- Internal canonical audio master must always be normalized to 44.1 kHz before analysis/export.
- Phase 1 is lights-only. Do not implement closures unless explicitly enabled behind a feature flag.
- All preview playback must be driven by the same canonical timeline data that is used to generate the FSEQ.
- The ZIP export structure must be:
  - README.md
  - LightShow/<basename>.fseq
  - LightShow/<basename>.wav or .mp3
- The FSEQ basename and the audio basename must match exactly.
- Add tests for upload, timeline generation, FSEQ generation, ZIP export and preview synchronization.
- Add Playwright E2E tests for local WAV upload and ZIP download.
- If YouTube import is implemented, gate it behind ENABLE_YOUTUBE_IMPORT and require an explicit user rights confirmation checkbox.
- Never describe YouTube import as using the official YouTube API for audio extraction.
- Run all of the following before considering the task done:
  - pnpm lint
  - pnpm typecheck
  - pnpm test
  - pnpm test:e2e
- Document all non-obvious implementation decisions in docs/architecture.md.
```

Brug derefter denne **hovedprompt** i Codex, helst i Plan mode først:

```md
Treat this file as the full project specification.

# Goal

Build a modern web application that can generate and simulate Tesla Custom Light Show files from audio chosen by the user.

The application must:
- upload MP3 and WAV
- optionally import audio from a YouTube URL when the user enters a URL and clicks "Importer sang"
- let the user preview the light show in sync with audio and a visible timeline
- let the user download a ZIP containing:
  - README.md
  - LightShow/<basename>.fseq
  - LightShow/<basename>.wav or .mp3
- ensure the basename of the FSEQ and audio file matches exactly

# Product direction

Build this as a deterministic, production-style system with:
- a Next.js web frontend
- a Python FastAPI media/api service
- a worker for heavy background jobs
- a shared schema/types package

Do not build a toy demo. Build an implementation that is clean, testable and can be run locally with Docker Compose.

# Hard constraints

- Internal canonical audio master must always be normalized to 44.1 kHz before analysis.
- Default export must be WAV.
- Support MP3 input and WAV input.
- YouTube import must be behind ENABLE_YOUTUBE_IMPORT.
- YouTube import UI must require an explicit confirmation checkbox stating the user has the right to import and use the audio.
- Phase 1 must generate lights-only shows. Closures are optional and disabled by default.
- Use one canonical timeline model for both preview and FSEQ export.
- The preview must support realistic Tesla models and correct light placement.
- The preview must include model selection with presets for:
  - Model 3/Y reflector
  - Model 3/Y projector
  - Model S reflector
  - Model S projector
  - Model X
  - Cybertruck
- The timeline must stay synchronized with audio playback.
- The ZIP export structure must be exactly:
  - README.md
  - LightShow/<basename>.fseq
  - LightShow/<basename>.<ext>
- <ext> is wav by default, mp3 only if explicitly selected by user.
- The FSEQ writer must be implemented as an explicit module with unit tests.
- Add a Tesla validator integration step in tests or dev tooling.
- Keep all implementation decisions documented.

# Implementation requirements

## Frontend

Create:
- a landing page with:
  - drag-and-drop upload for MP3/WAV
  - file picker upload
  - YouTube URL input
  - "Importer sang" button
  - model selector
  - style preset selector
  - preview canvas
  - waveform/timeline panel
  - generate/export section
- a jobs/progress UX
- an error UX for invalid file type, invalid URL, failed import, analysis failure and export failure

Use:
- Next.js App Router
- TypeScript
- React
- a 3D stack based on React Three Fiber + Three.js
- a waveform/timeline component
- modern component styling

## Backend / worker

Implement endpoints for:
- POST /api/uploads/audio
- POST /api/imports/youtube
- GET /api/jobs/:id
- GET /api/jobs/:id/timeline
- GET /api/jobs/:id/export
- GET /api/jobs/:id/readme

Implement server modules for:
- audio normalization
- audio feature extraction
- section/beat detection
- timeline generation
- Tesla channel mapping
- FSEQ writing
- ZIP export
- README generation

## Timeline generation

Design a rule-based generator first:
- beats/onsets drive accents and pulses
- low band energy drives stronger front/rear groups
- high band energy drives sharper details
- sustained sections use ramps rather than hard flashes
- cross-vehicle safe mode uses lights that exist across variants
- support a few visual styles:
  - clean/minimal
  - energetic/pop
  - cinematic/ramping
  - cybertruck emphasis when Cybertruck is selected

Store the generated show in a canonical timeline format such as:
- metadata
- audio metadata
- frame interval
- channel values per frame
- preview mapping metadata

## Preview realism

Implement the preview so it uses:
- per-model light anchors
- emissive materials and light effects
- model-specific channel behavior
- correct boolean versus ramping versus full-brightness semantics
- exact shared timeline clock with audio playback

Do not fake sync with timers alone. Use the audio playback clock as the source of truth.

## Tesla compatibility

Use Tesla’s official light-show assets and validator as source of truth.
Do not guess channel ordering.
Document how channel ordering was derived.

The export must generate:
- a Tesla-compatible V2 Uncompressed FSEQ
- matching audio filename
- README.md with:
  - how to copy files to a USB drive
  - expected LightShow folder structure
  - supported audio format used
  - basename used
  - generation timestamp
  - note whether YouTube import was used

## Testing

Add:
- unit tests for FSEQ writer
- unit tests for audio normalization
- unit tests for timeline generation
- unit tests for ZIP export
- backend API tests
- Playwright E2E tests for:
  - local WAV upload
  - preview loads
  - timeline sync starts
  - ZIP download works
- if ENABLE_YOUTUBE_IMPORT=true:
  - add a YouTube import E2E/smoke test using:
    https://www.youtube.com/watch?v=VCWEHOQGQb8

For local deterministic tests:
- include a very short local WAV fixture in the repo
- also support manual testing with user-provided WAV files

## Deliverables

Create:
- working code
- Docker Compose for local development
- architecture docs
- README for developers
- sample screenshots or test artifacts if possible

# Done when

The task is done only when:
- the app runs locally
- a user can upload WAV and MP3
- the app can generate a timeline and preview
- the preview plays in sync with audio and timeline
- a ZIP download is produced with the correct structure
- the FSEQ and audio basename match
- automated tests pass
- the architecture and mapping decisions are documented

Before implementing, produce a milestone-based plan.
Then implement milestone by milestone.
After each milestone, run tests/lint/typecheck and repair failures before continuing.
```

Hvis du vil styre Codex endnu hårdere, så start med noget i stil med: “Læs `AGENTS.md`. Brug promptfilen som fuld specifikation. Lav først en milepælsplan. Implementér derefter lys-only MVP med lokal WAV/MP3-upload og ZIP-eksport. Når det er grønt, implementér realistisk 3D-preview. Lad YouTube-import være feature-flagget og dokumentér risici tydeligt.” Det matcher direkte Codex-best-practices om plan først, vedvarende instruktioner i `AGENTS.md` og et klart “done when”. citeturn20view0turn20view1turn20view2

Kravene i prompten om `LightShow/`-struktur, matchende basenames, 44,1 kHz, 20 ms frame grid, V2 Uncompressed, cross-vehicle support og faseopdeling mellem lys og closures kommer direkte ud af Tesla’s guide og validator; opdelingen mellem `AGENTS.md`, specifikationsfil og milepælsplan følger OpenAI’s egne Codex-anbefalinger. citeturn35view1turn7view1turn37view0turn6view0turn20view0turn20view1turn20view2

## Teststrategi som Codex skal bygge ind fra dag ét

Den praktiske teststrategi bør være tredelt. Først **backend-tests** med pytest/FastAPI for upload, analyse-job, FSEQ-writer og ZIP-eksport. FastAPI’s egen dokumentation anbefaler testflowet med pytest og understreger, at testning af FastAPI-applikationer er enkel via HTTPX-baserede værktøjer. Dernæst **frontend/E2E** med Playwright, som officielt understøtter både file chooser upload og download-capture. Til sidst en **compatibility-test**, hvor du kører Tesla’s `validator.py` mod den genererede `.fseq` i CI eller i hvert fald i en lokal smoke-test. citeturn31search2turn31search0turn31search1turn31search4turn37view0turn6view0

Til lokal WAV-test bør Codex selv generere eller checke en lille deterministisk fixture ind i repoet, for eksempel 5–10 sekunder med kendte peaks, så preview, frame count og eksport kan testes stabilt. Det giver også mulighed for at verificere, at 20 ms-grid, waveform og 3D-preview faktisk holder sync over tid uden at være afhængige af eksterne filer. Fordi brugerkravet specifikt siger “test med lokal WAV hvis muligt”, bør dette ikke stå som manuel TODO, men som en reel del af repoets testinventar. Tesla’s validator output med frame count og step time gør det let at sammenholde denne smoke-test med den genererede fil. citeturn37view0turn6view0

Til YouTube-smoke-test er det rigtige acceptkriterium ikke kun “kan hente noget”, men: URL valideres, bruger skal acceptere rettighedsbekræftelse, jobstatus går fra queued til completed, audio normaliseres til 44,1 kHz, timeline genereres, preview kan afspilles, og ZIP eksporteres korrekt. Den URL, du gav, resolver til videoen **“ZULU Awards 2022: The Minds Of 99 - Under Din Sne”**, så det er en god fast reference i tests og dokumentation. Men igen: hold denne smoke-test bag `ENABLE_YOUTUBE_IMPORT`, netop fordi YouTube-import er det mest policy-følsomme punkt i hele produktet. citeturn16search0turn12view0turn14search0turn14search2

En god v1-accepttest er derfor kort fortalt denne: brugeren uploader en lokal WAV, vælger en model, genererer showet, ser waveform og 3D-preview starte synkront, klikker download, og den hentede ZIP indeholder `README.md` samt `LightShow/<samme-basename>.fseq` og `LightShow/<samme-basename>.wav`. Herefter skal Tesla-validatoren acceptere `.fseq`-filen som V2 uncompressed med gyldige headerfelter. citeturn35view1turn7view1turn6view0turn31search1

## Risici og åbne spørgsmål

Den største tekniske usikkerhed er **ikke**, om appen kan bygges, men hvor meget du vil forsøge at understøtte i v1. Tesla’s officielle materiale giver dig klare eksportkrav og en validator, men den fulde, endelige kanalrækkefølge og alle modelspecifikke detaljer bør i implementeringen udledes fra Tesla’s officielle xLights-projektassets, ikke gættet ud fra sekundære kilder. Det betyder, at Codex skal instrueres til at gøre Tesla’s projektmappe og validator til “source of truth” og dokumentere afledningen i repoet. citeturn37view0turn6view0

Den største produktmæssige risiko er **YouTube-import**. Teknisk er det oplagt at bygge med `yt-dlp` og FFmpeg, men policy-mæssigt er feltet følsomt, fordi YouTube både har generelle downloadbegrænsninger i Terms og eksplicit forbyder audio-separation og download-features i API-baserede klienter. Hvis du vil minimere risiko og få et stærkere første produkt, så gør lokal MP3/WAV-upload til den primære brugerrejse og sæt YouTube-import som tydeligt feature-flagget, rettighedsbekræftet, selvhostet ekstrafunktion. citeturn18view1turn18view2turn12view0turn14search0turn14search2

Det sidste åbne spørgsmål er 3D-assets. Tesla’s officielle guide viser et xLights 3D-preview og kanal-lokationer, men de kilder, der er gennemgået her, giver ikke i sig selv en færdig, web-optimeret GLB/GLTF-asset-pakke til din app. Derfor skal Codex enten integrere licenserede 3D-modeller eller bygge en asset-pipeline, hvor modeller og lysanchors håndteres særskilt. Det ændrer ikke den overordnede anbefaling: den korrekte strategi er stadig separate modelprofiler, per-model light anchors og en fælles timeline-motor for preview og eksport. citeturn37view0turn38view0turn40view4turn40view5