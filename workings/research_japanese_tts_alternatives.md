# Research: Japanese TTS API Alternatives to ElevenLabs

## tl;dr
VOICEVOX (free, 26+ anime voices, no timestamps) or Azure TTS (paid, timestamps for lip-sync, Nanami cheerful style) are best alternatives. Kokoro TTS is permissively licensed. Style-Bert-VITS2 has Hololive models but AGPL license.

---

## Summary Comparison

| Service | Japanese | Anime Voices | Timestamps | Free Tier | License |
|---------|----------|--------------|------------|-----------|---------|
| **ElevenLabs** | ✅ | ✅ Yui | ⚠️ Varies | Limited | Commercial |
| **VOICEVOX** | ✅ | ✅ 26+ chars | ❌ | ✅ Free | OSS (check voice) |
| **Azure TTS** | ✅ | ⚠️ Nanami | ✅ Visemes | ⚠️ Paid | Commercial |
| **Style-Bert-VITS2** | ✅ | ✅ Hololive | ❌ | ✅ Free | AGPL-3.0 |
| **Kokoro TTS** | ✅ | ❌ | ❌ | ✅ Free | Apache 2.0 |
| **Amazon Polly** | ✅ | ❌ | ✅ | ⚠️ Paid | Commercial |
| **Google Cloud TTS** | ✅ | ❌ | ⚠️ Manual | ⚠️ Paid | Commercial |
| **CoeFont** | ✅ | ✅ | ❓ | ⚠️ Limited | Commercial |

---

## Detailed Breakdown

### 1. VOICEVOX ⭐ Best Free Option with Anime Voices

**URL:** https://voicevox.hiroshiba.jp/

**What it is:** Open-source Japanese TTS engine with 26+ character voices designed for anime/VTuber style.

**Voices include:**
- Zundamon (ずんだもん) — cute mascot character
- Kasukabe Tsumugi — soft feminine voice
- Multiple moe/anime character options

**Integration options:**
- Desktop app (Windows/Mac/Linux)
- VOICEVOX Core CLI for server integration
- Cloud API: https://voicevox.su-shiki.com/su-shikiapis/ (free slow / paid fast)
- FastAPI server implementations on GitHub

**Pricing:** FREE (check individual voice licenses for commercial use)

**Timestamps:** Not documented — would need testing or forced alignment post-hoc

**Pros:**
- Completely free
- Authentic anime voices designed by Japanese creators
- Active community, regular updates
- Can run locally (no API costs)

**Cons:**
- No built-in timestamp/phoneme timing for lip-sync
- Voice licenses vary (some restrict commercial use)
- Cloud API has rate limits

**Links:**
- Main site: https://voicevox.hiroshiba.jp/
- GitHub: https://github.com/VOICEVOX/voicevox_engine
- Cloud API: https://voicevox.su-shiki.com/su-shikiapis/

---

### 2. Azure TTS ⭐ Best for Lip-Sync Timestamps

**URL:** https://learn.microsoft.com/en-us/azure/ai-services/speech-service/

**What it is:** Microsoft's neural TTS with 10 Japanese voices and full viseme/timestamp support.

**Japanese voices:**
- `ja-JP-NanamiNeural` (Female) — supports `chat` and `cheerful` styles ⭐
- `ja-JP-AoiNeural` (Female)
- `ja-JP-MayuNeural` (Female)
- `ja-JP-ShioriNeural` (Female)
- `ja-JP-KeitaNeural` (Male)
- Plus others

**Timestamp support:** ✅ Full viseme and word-boundary events via SDK

**Pricing:** ~$16 per 1 million characters (neural voices)

**Pros:**
- Confirmed timestamp support for Japanese
- Nanami with "cheerful" style closest to cute anime
- Professional reliability, excellent SDK
- SSML for fine control

**Cons:**
- Not specifically anime-styled (more "professional cute")
- Paid service
- Requires Azure account setup

**Waifu project:** Community project using Azure for anime voices: https://github.com/Waifu-AI-Labs/waifu-voice-synthesis

**Links:**
- Docs: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
- Japanese voices: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/language-support
- Timestamp docs: https://learn.microsoft.com/en-us/answers/questions/1164959/does-azure-text-to-speech-support-timestamps-for-j

---

### 3. Style-Bert-VITS2 ⭐ Best Quality Open-Source

**URL:** https://github.com/litagin02/Style-Bert-VITS2

**What it is:** High-quality Japanese TTS with community models including Hololive VTuber voices.

**Features:**
- JP-Extra model with superior Japanese pronunciation
- Pre-trained models auto-download
- FastAPI server included
- Community models on HuggingFace (Hololive, anime characters)

**Installation:**
```bash
pip install style-bert-vits2
python server_fastapi.py  # API at /docs
```

**Pricing:** FREE

**License:** ⚠️ AGPL-3.0 (source disclosure required for commercial use)

**Timestamps:** ❌ No phoneme timing output

**Pros:**
- Excellent Japanese quality
- Hololive/anime voice models available
- Can train custom voices
- Active development

**Cons:**
- AGPL license restricts commercial use without source disclosure
- No timestamp support for lip-sync
- GPU recommended for training
- 100-char input limit by default

**Links:**
- GitHub: https://github.com/litagin02/Style-Bert-VITS2
- Replicate (Hololive): https://replicate.com/zsxkib/hololive-style-bert-vits2

---

### 4. Kokoro TTS — Best Permissive License

**URL:** https://huggingface.co/hexgrad/Kokoro-82M

**What it is:** Lightweight multilingual TTS (82M params) with Apache 2.0 license.

**Features:**
- Japanese support
- Very efficient (small model)
- OpenAI-compatible API implementations available
- Docker-ready (Kokoro-FastAPI)

**Pricing:** FREE (commercial APIs <$1/million chars)

**License:** ✅ Apache 2.0 (fully permissive)

**Timestamps:** ❌ Not exposed

**Pros:**
- Fully permissive license
- Very lightweight
- Easy deployment options
- Good for cost-sensitive production

**Cons:**
- Not anime-styled (more neutral voices)
- No timestamp support
- Less character variety

**Links:**
- HuggingFace: https://huggingface.co/hexgrad/Kokoro-82M
- Kokoro-FastAPI: search GitHub for Docker implementations
- Architecture: https://kokorotts.net/

---

### 5. Amazon Polly

**URL:** https://aws.amazon.com/polly/

**Japanese voices:**
- Mizuki (Standard)
- Takumi (Standard/Neural)
- Kazuha (Neural)
- Tomoko (Neural)

**Timestamps:** ✅ Full speech marks support

**Pricing:**
- Neural: $16/million chars
- Standard: $4/million chars
- Free tier: 1M chars/month for 12 months

**Pros:**
- Confirmed timestamp support
- AWS integration
- Generous free tier

**Cons:**
- No anime voices (professional only)
- Fewer voice options than Azure

---

### 6. Google Cloud TTS

**URL:** https://cloud.google.com/text-to-speech

**Japanese voices:** Multiple (Standard, WaveNet, Neural2, Studio)

**Timestamps:** ⚠️ Manual `<mark>` tags in SSML only — no automatic word-level

**Pricing:** ~$4-16/million chars depending on voice type

**Pros:**
- Good voice quality
- Multiple voice types

**Cons:**
- No automatic timestamps (must manually insert marks)
- No anime voices
- Studio voices don't support marks at all

---

### 7. CoeFont

**URL:** https://coefont.cloud/en | API: https://docs.coefont.cloud/en/

**What it is:** Japanese platform with 10,000+ AI voices including celebrities and character voices.

**Features:**
- Japanese voice actor voices
- Character/anime-style options
- Custom voice creation (~$3.50 for 15min)

**Pricing:**
- Free: 800 chars
- Paid plans: ~80,000 chars/month

**Timestamps:** ❓ Not documented

**Pros:**
- Large voice library
- Japanese-focused
- Character voices available

**Cons:**
- Complex API auth (HMAC signing)
- Rate limits
- Commercial use requires paid plan

---

### 8. COEIROINK

**URL:** coeiroink.com

**What it is:** Free Japanese TTS with AI voice actor characters.

**Features:**
- Characters like Kinnae, Akahana
- 400+ community "Mycoeiroink" voices
- FREE for commercial use

**Pros:**
- Free commercial use
- Cute character voices

**Cons:**
- Limited English documentation
- Desktop software primarily
- Adult content restrictions vary

---

## Recommendations for Wibwob-kun

### Option A: Best Free Anime Voices (No Timestamps)
**Use VOICEVOX** with amplitude-based mouth animation fallback.

```
Pros: Free, authentic anime voices, Japanese-designed
Cons: No timestamps, need to handle amplitude-based lip-sync
```

### Option B: Best Lip-Sync Support (Paid)
**Use Azure TTS** with Nanami cheerful style.

```
Pros: Full timestamp/viseme support, reliable
Cons: Not as anime-styled, costs money
```

### Option C: Hybrid Approach
**ElevenLabs for Wib** (cute Yui voice) + **Azure for Wob** (precise Nanami voice).

```
Pros: Different voices match different personalities
Cons: Two API integrations, higher complexity
```

### Option D: Self-Hosted Open Source
**Style-Bert-VITS2** with Hololive models, run locally.

```
Pros: Free, anime voices, full control
Cons: AGPL license, no timestamps, needs GPU
```

---

## Lip-Sync Without Timestamps

If using a TTS without timestamp support:

1. **Amplitude-based** (current fallback) — use Web Audio AnalyserNode
2. **Forced alignment** — post-process with Montreal Forced Aligner
3. **ML lip-sync** — use Wav2Lip or similar (overkill for emoji grid)

For emoji-grid mouth animation, amplitude-based is probably sufficient.

---

## Environment Variables (if switching)

```env
# VOICEVOX
VOICEVOX_API_URL=https://api.su-shiki.com/v2/voicevox/audio/
VOICEVOX_SPEAKER_ID=1  # Zundamon

# Azure
AZURE_SPEECH_KEY=...
AZURE_SPEECH_REGION=japaneast
AZURE_VOICE_NAME=ja-JP-NanamiNeural

# Keep ElevenLabs as fallback
ELEVENLABS_API_KEY=...
ELEVENLABS_VOICE_ID_JA=fUjY9K2nAIwlALOwSiwc  # Yui
```

---

## Sources

- VOICEVOX: https://voicevox.hiroshiba.jp/
- Azure TTS: https://learn.microsoft.com/en-us/azure/ai-services/speech-service/
- Style-Bert-VITS2: https://github.com/litagin02/Style-Bert-VITS2
- Kokoro TTS: https://huggingface.co/hexgrad/Kokoro-82M
- Amazon Polly: https://aws.amazon.com/polly/
- Google Cloud TTS: https://cloud.google.com/text-to-speech
- CoeFont: https://coefont.cloud/en
- Waifu Voice Synthesis: https://github.com/Waifu-AI-Labs/waifu-voice-synthesis
