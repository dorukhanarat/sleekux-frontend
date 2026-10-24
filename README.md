# SleekUx Frontend

A web app for building text transformation pipelines: chain steps such as replace or uppercase, configure each step's parameters, run the pipeline, and see the output of every step along the way.

Built with **Vue 3**, **TypeScript**, and **Vite**.

## Prerequisites

- **Node.js**: `v24.15+` recommended
  - Running the app needs `v20.19+` or `v22.12+`
  - Running the tests needs `v22.22.2+`, `v24.15+`, or `v26+`
- **npm**: `v9+`
- **SleekUx backend** (`sleekux-backend`) running on `http://localhost:8080`

## Backend

The frontend gets its list of transformations from the backend and sends pipelines to it to run. Without the backend running, the page shows an error with a Retry button.

The backend URL is set in `src/api/client.ts`. The frontend uses these endpoints:

- `GET /api/transformations`: the available transformations and their parameters
- `POST /api/transform`: run a pipeline on the input text

## Setup & Running Locally

cd sleekux-frontend
npm install
npm run dev

- Web App URL: http://localhost:5173

## Building for Production

```bash
npm run build     # type-check with vue-tsc, then build into dist/
npm run preview   # serve the built app locally
```

`npm run build` fails on type errors, including errors in test files.

## Running Tests

Unit tests use **Vitest** and **Vue Test Utils** with a jsdom environment. The API is mocked, so the backend does not need to be running.

```bash
npm test             # run all tests once
npm run test:watch   # re-run tests on file changes
```

Test files live next to the code they cover, in `__tests__` folders:

- `src/components/__tests__/`: `DynamicField` and `TransformationPipeline`
- `src/api/__tests__/`: API client calls

## Project Structure

```
src/
├── api/
│   ├── client.ts               # axios instance with the backend URL
│   └── transformationApi.ts    # calls to the backend endpoints
├── components/
│   ├── TransformationPipeline.vue  # main screen: input, steps, run, results
│   └── DynamicField.vue            # one parameter input (text, number, or checkbox)
├── types/
│   └── transformation.ts       # shared TypeScript types for the API
├── App.vue
└── main.ts
```
