# Thought Process

How the SleekUx frontend was built, commit by commit, and the reasoning behind it.

## Core Idea: Let the Backend Describe the UI

The frontend doesn't know about any specific transformation. `GET /api/transformations` returns each transformation with its parameters (name, label, type, required, default, placeholder), and the frontend builds the forms from that. When the backend grew to 20 transformations, they all worked with no frontend changes.

The trade-off: the frontend can only render what the schema expresses. A field like "Trim Mode" has three valid values, but the schema can't list them, so it is free text.

## Development Phases

**1. Setup** (`407d45b`, `04a100b`): Vite + Vue 3 + TypeScript template, so the API data shapes are checked at compile time.

**2. API layer and types first** (`1bcfc3c`): the data contract was defined before any UI. One axios client holds the backend URL and timeout, and typed functions wrap each endpoint, so components never make HTTP calls and the API is easy to mock. `ParameterType` ends in `| string` so an unknown type from the backend falls back to a text field instead of breaking the page.

**3. Loading transformations** (`45bd41d`): the pipeline component handles loading, error with Retry, and ready states. It also fixed the endpoint, which first pointed at `api/transform` instead of `api/transformations`.

**4. Step management** (`321c597`, `89216b4`): steps can be added, reordered and deleted. Each step gets a `crypto.randomUUID()` id, used as the list key so reordering doesn't mix up forms. Parameters start from their defaults. A temporary `<pre>` dump of the parameters was used to check this before the forms existed.

**5. Dynamic forms** (`f8a4104`): `DynamicField.vue` picks the input for each parameter type and is bound with `v-model`, keeping the type-to-input logic in one testable place.

**6. Running the pipeline, bug fixes and tests** (`ac6db2f`): added the input text, Run button, and a results table with each step's input, output and time, which makes it easy to see which step misbehaved. Several earlier bugs were found here:

| Bug | Cause |
| --- | --- |
| Edited parameters were ignored | `DynamicField` emitted `update:ModelValue`, but `v-model` listens for `update:modelValue`. No error, and the input still *looked* updated. |
| Empty-state message and step list could both show | `v:if` / `v:else` instead of `v-if` / `v-else`, silently ignored by Vue |
| Placeholder option had no empty value | `vakue=""` typo |
| Cleared number field sent `0` | `Number('')` is `0` |

Vitest and Vue Test Utils were added, with the API mocked so tests run without the backend. Every fix has a test that fails without it: putting the `update:ModelValue` bug back made 6 tests fail.

**7. Documentation** (`c1cb930`): the README gained a description, the backend requirement, build commands, and correct Node versions (Node 24.15+; the original "18+" was too old for Vite 8 and jsdom).

**8. Visible whitespace** (`d4287f9`): Trim looked like it did nothing because HTML collapses whitespace when displaying text. Results now use `white-space: pre-wrap` in a shaded box. In a text tool, whitespace is data.

**9. Supporting the expanded backend** (`8d25746`): the new transformations exposed four usability problems:

1. Hints were placeholders, hidden once a field had a default. They now always show under the field.
2. Single-line inputs drop line breaks, so "Join With: `\n`" couldn't work. Text fields became text areas, and values with edge whitespace show a preview (`·` space, `→` tab, `↵` line break).
3. A failed run replaced the whole form with an error box. Run errors now show under the Run button with the backend's own message, and the steps stay editable.
4. Empty required fields are now caught before sending, and cleared optional numbers use their default.
