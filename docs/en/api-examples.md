# API Usage Examples

This document provides simple API usage examples, including OpenAI-compatible API, Gemini native API, and Anthropic-compatible API formats.

## 🤖 OpenAI-Compatible API

```bash
curl -X POST http://localhost:7861/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "stream": false
  }'
```

### 🌊 Streaming Response

```bash
curl -X POST http://localhost:7861/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash",
    "messages": [
      {
        "role": "user",
        "content": "Write a short poem about autumn"
      }
    ],
    "stream": true
  }'
```

### 🖼️ Generate Image [Official Docs](https://ai.google.dev/gemini-api/docs/image-generation)

```bash
curl -X POST http://localhost:7861/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash-image-preview",
    "messages": [
      {
        "role": "user",
        "content": "Generate a kitten"
      }
    ],
    "stream": false
  }'
```

#### 🫗 Stream Generation

```bash
curl -X POST http://localhost:7861/v1/chat/completions \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash-image-preview",
    "messages": [
      {
        "role": "user",
        "content": "Generate a kitten"
      }
    ],
    "stream": true
  }'
```

### 💬 Responses API

```bash
curl -X POST http://localhost:7861/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash",
    "input": "Summarize the main idea of functional programming in 3 sentences.",
    "stream": false
  }'
```

#### 🌊 Streaming Responses API

```bash
curl -X POST http://localhost:7861/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "model": "gemini-2.5-flash",
    "input": [
      {
        "role": "user",
        "content": [
          {
            "type": "input_text",
            "text": "Write a short poem about autumn."
          }
        ]
      }
    ],
    "stream": true
  }'
```

## ♊ Gemini Native API Format

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, how are you?"
          }
        ]
      }
    ]
  }'
```

### 🌊 Streaming Content Generation

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash:streamGenerateContent?alt=sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Write a short poem about autumn"
          }
        ]
      }
    ]
  }'
```

### 🖼️ Generate Image [Official Docs](https://ai.google.dev/gemini-api/docs/image-generation)

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash-image-preview:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Generate a kitten"
          }
        ]
      }
    ]
  }'
```

#### 🫗 Stream Generation

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash-image-preview:streamGenerateContent?alt=sse \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Generate a kitten"
          }
        ]
      }
    ]
  }'
```

### 🎨 Imagen (Image Generation) [Official Docs](https://ai.google.dev/gemini-api/docs/imagen)

Use the `imagen` series models to generate images through the `:predict` endpoint.

#### Basic Image Generation

```bash
curl -X POST http://localhost:7861/v1beta/models/imagen-4.0-generate-001:predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "instances": [
      {
        "prompt": "Robot holding a red skateboard"
      }
    ],
    "parameters": {
      "sampleCount": 1
    }
  }'
```

#### Generate Multiple Images

Adjust `sampleCount` to generate multiple images at once (maximum 4).

```bash
curl -X POST http://localhost:7861/v1beta/models/imagen-4.0-generate-001:predict \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "instances": [
      {
        "prompt": "A futuristic city at sunset with flying cars"
      }
    ],
    "parameters": {
      "sampleCount": 4
    }
  }'
```

> 💡 **Tip**: Imagen responses return base64-encoded image data. Each generated image will be included in the `predictions` array.

### 🎤 TTS (Text-to-Speech) [Official Docs](https://ai.google.dev/gemini-api/docs/speech-generation)

#### Basic TTS (Default Voice)

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash-preview-tts:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, this is a text-to-speech test."
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["AUDIO"]
    }
  }'
```

#### Specify Voice

Available voices: `Kore`, `Puck`, `Charon`, `Fenrir`, `Aoede`

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash-preview-tts:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "Hello, this is a text-to-speech test."
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "voiceConfig": {
          "prebuiltVoiceConfig": {
            "voiceName": "Kore"
          }
        }
      }
    }
  }'
```

#### Multi-Speaker Dialogue

Write the dialogue in the prompt and configure multiple speaker voices using `multiSpeakerVoiceConfig` (up to 2 speakers).

```bash
curl -X POST http://localhost:7861/v1beta/models/gemini-2.5-flash-preview-tts:generateContent \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your-api-key-1" \
  -d '{
    "contents": [
      {
        "role": "user",
        "parts": [
          {
            "text": "TTS the following conversation between Joe and Jane:\nJoe: How are you today Jane?\nJane: I am doing great, thanks for asking!"
          }
        ]
      }
    ],
    "generationConfig": {
      "responseModalities": ["AUDIO"],
      "speechConfig": {
        "multiSpeakerVoiceConfig": {
          "speakerVoiceConfigs": [
            {
              "speaker": "Joe",
              "voiceConfig": {
                "prebuiltVoiceConfig": {
                  "voiceName": "Charon"
                }
              }
            },
            {
              "speaker": "Jane",
              "voiceConfig": {
                "prebuiltVoiceConfig": {
                  "voiceName": "Kore"
                }
              }
            }
          ]
        }
      }
    }
  }'
```

> 💡 **Tip**: TTS responses return base64-encoded audio data in `audio/L16;codec=pcm;rate=24000` format. You need to decode and convert it to WAV format for playback.

## 👤 Anthropic Compatible API

```bash
curl -X POST http://localhost:7861/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-1" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "gemini-2.5-flash",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Hello, how are you?"
      }
    ],
    "stream": false
  }'
```

### 🌊 Streaming Response

```bash
curl -X POST http://localhost:7861/v1/messages \
  -H "Content-Type: application/json" \
  -H "x-api-key: your-api-key-1" \
  -H "anthropic-version: 2023-06-01" \
  -d '{
    "model": "gemini-2.5-flash",
    "max_tokens": 1024,
    "messages": [
      {
        "role": "user",
        "content": "Write a poem about autumn"
      }
    ],
    "stream": true
  }'
```
