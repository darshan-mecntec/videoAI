# Node Engine Microservice

Defines typed port contracts (`string`, `image`, `video`, `audio`, `json`), parameter schemas, and graph connection validation for visual workflow canvas nodes.

## Responsibilities
- Catalog registry for all visual node definitions (*text-to-image*, *text-to-video*, *text-to-audio*, *voice-clone*, *avatar-lipsync*, *inpainting*, *upscale*, *prompt-template*).
- Typed input/output port definitions and parameter JSON schemas.
- Port-type compatibility validation (`POST /v1/nodes/validate-graph`).

## Running Locally
```bash
npm install
npm run dev
```

## Running Tests
```bash
npm test
```
