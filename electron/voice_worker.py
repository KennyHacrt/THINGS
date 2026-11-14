"""Local, in-memory speech transcription. No microphone/audio upload to a provider."""
import base64
import io
import json
import os
from pathlib import Path
import sys
import wave

os.environ.setdefault('HF_HUB_DISABLE_SYMLINKS_WARNING', '1')
from faster_whisper import WhisperModel

cache = Path(__file__).resolve().parent.parent / '.things-local' / 'models'
model = None

def load_model():
    global model
    if model is None:
        model = WhisperModel('base', device='cpu', compute_type='int8', cpu_threads=4,
                             download_root=str(cache))
    return model

def transcribe(encoded, partial=False):
    if not isinstance(encoded, str) or len(encoded) > 2_000_000:
        raise ValueError('Record a voice request of at most 30 seconds.')
    audio = base64.b64decode(encoded, validate=True)
    with wave.open(io.BytesIO(audio)) as wav:
        if wav.getnchannels() != 1 or wav.getsampwidth() != 2 or wav.getframerate() != 16000:
            raise ValueError('Expected 16 kHz mono PCM audio.')
        if not 0.3 <= wav.getnframes() / 16000 <= 31:
            raise ValueError('Speak a request of 1–30 seconds.')
    segments, info = load_model().transcribe(io.BytesIO(audio), beam_size=1 if partial else 5,
                                            condition_on_previous_text=False, vad_filter=not partial,
                                            initial_prompt='THINGS assistant. Keeta food delivery. Tsim Sha Tsui. Google Flights. Tokyo. Hong Kong. X social network.')
    text = ' '.join(s.text.strip() for s in segments if s.no_speech_prob < 0.8).strip()
    if not text and not partial:
        raise ValueError('No speech detected. Try speaking again near your microphone.')
    return {'text': text[:4000], 'language': info.language}

if '--prepare' in sys.argv:
    load_model()
    print('Local voice model ready.', flush=True)
else:
    for line in sys.stdin:
        request = {}
        try:
            request = json.loads(line)
            result = transcribe(request.get('audio'), request.get('partial') is True)
            print(json.dumps({'id': request['id'], 'result': result}, ensure_ascii=True), flush=True)
        except Exception as error:
            print(json.dumps({'id': request.get('id'), 'error': str(error)}, ensure_ascii=True), flush=True)
