# OHIF-AI

[![Docker](https://img.shields.io/badge/docker-required-blue.svg)](https://www.docker.com/)
[![CUDA](https://img.shields.io/badge/CUDA-12.6-green.svg)](https://developer.nvidia.com/cuda-toolkit)
[![YouTube](https://img.shields.io/badge/demo-video-red.svg)](https://youtu.be/z3aq3yd-KRA)

**Interactive AI segmentation and report generation for medical imaging, directly in your browser.**

OHIF-AI brings two main capabilities into the <a href="https://ohif.org/" target="_blank">OHIF Viewer</a>:

1. **Segmentation** — Interactive AI segmentation for medical imaging using **visual prompts** (points, scribbles, lassos, bounding boxes) with models such as **nnInteractive**, **SAM2**, **MedSAM2**, and **SAM3**, or using **text prompts** with **VoxTell**. Supports iterative refinement, live inference, and 3D propagation from minimal input.
2. **Report generation** — AI-assisted radiology-style reports from 3D CT/MRI using **Medgemma 1.5**.

By combining these foundation models with the familiar OHIF interface, researchers and clinicians can perform prompt-based segmentation and generate reports without leaving the web environment.

---

## 📋 Table of Contents

- [Features](#-features)
- [Demo Video](#-demo-video)
- [Getting Started](#-getting-started)
- [Usage Guide](#-usage-guide)
  - [Segmentation](#segmentation)
    - [Visual prompts](#visual-prompts)
    - [Model selection & inference](#model-selection)
    - [Text-prompt segmentation](#text-prompt-segmentation)
  - [Report generation](#report-generation)
- [System architecture & segmentation data flow](#-system-architecture--segmentation-data-flow)
- [Branch development summary & known issues](#-branch-development-summary--known-issues)

---

## ✨ Features

**Segmentation (medical imaging)**  
- 🖱️ **Visual prompts** — Real-time segmentation with points, scribbles, lassos, and bounding boxes  
- 📝 **Text prompts** — Free-form text to obtain segmentation (see [Text-prompt segmentation](#text-prompt-segmentation) for usage and important notices)  
- 🚀 **Live mode** — Automatic inference on every prompt  
- 📦 **3D propagation** — Single prompt segments the entire volume  
- 🤖 **Multiple models** — nnInteractive, SAM2, MedSAM2, SAM3, and VoxTell  

**Report generation**  
- 📄 **Medgemma 1.5 4B** — Generate radiology-style reports from 3D CT/MRI with configurable instruction, query, and slice range  

**General**  
- 🌐 **Browser-based** — No local installation; runs in the web browser

---

## 🎥 Demo Video

<a href="https://youtu.be/z3aq3yd-KRA" target="_blank">
  <img src="https://img.youtube.com/vi/z3aq3yd-KRA/maxresdefault.jpg" alt="Demo Video" width="700">
</a>

Click to watch the full demonstration of OHIF-AI in action.

---

## 🚀 Getting Started

### Prerequisites

- **Docker** (v27.3.1 or later)
- **Docker Compose** — if `docker compose` is not available, install the plugin:
  ```bash
  mkdir -p ~/.docker/cli-plugins
  curl -SL https://github.com/docker/compose/releases/download/v2.27.1/docker-compose-linux-x86_64 \
    -o ~/.docker/cli-plugins/docker-compose
  chmod +x ~/.docker/cli-plugins/docker-compose
  ```
- **NVIDIA Container Toolkit** (v1.16.2 or later)
- **CUDA** v12.6 or compatible version
- NVIDIA GPU with appropriate drivers

### Model Checkpoints

Model checkpoints are typically downloaded automatically during setup. However, if you encounter issues with automatic downloads, you can manually download them:

**Automatically Downloaded Models:**
- **nnInteractive**: [Hugging Face](https://huggingface.co/nnInteractive/nnInteractive)
- **SAM2** (sam2.1-hiera-tiny): [Hugging Face](https://huggingface.co/facebook/sam2.1-hiera-tiny)
- **MedSAM2** (MedSAM2_latest): [Hugging Face](https://huggingface.co/wanglab/MedSAM2)
- **VoxTell**: [Hugging Face](https://huggingface.co/mrokuss/VoxTell)
- **MedGemma 1.5 4B**: [Hugging Face](https://huggingface.co/google/medgemma-1.5-4b-it) — requires your Hugging Face token (`HF_Token`) in `monai-label/monailabel/tasks/infer/basic_infer.py`

⚠️ **MedGemma VRAM:** MedGemma uses approximately **35 GB VRAM**. Either use one large GPU for all models, or allocate a **separate GPU** for MedGemma. To put MedGemma on another device (e.g. second GPU), set `device_map={"": "cuda:1"}` in `monai-label/monailabel/tasks/infer/basic_infer.py`.

**Manual Download Required:**

**SAM3 Model:**
1. Request access to the SAM3 model on [Hugging Face](https://huggingface.co/facebook/sam3)
2. Once access is granted, download the model checkpoint
3. Place the downloaded file as `sam3.pt` in the `monai-label/checkpoints/` directory

⚠️ **Note:** If the SAM3 checkpoint is not found, you will see a warning message and SAM3 will not be available for use. The application will continue to work with other models (nnInteractive, SAM2, MedSAM2, VoxTell, MedGemma 1.5 4B).

![SAM3 Not Found Warning](docs/images/sam3_not_found.png)

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/CCI-Bonn/OHIF-AI.git
   cd OHIF-AI
   ```

2. **Start the application**
   ```bash
   bash start.sh
   ```

3. **Access the viewer**
   
   Open your browser and navigate to: http://localhost:1026

4. **Load sample data**
   
   Upload all DICOM files from the `sample-data` directory

---

## 📖 Usage Guide

### Segmentation

OHIF-AI supports interactive segmentation in two ways: **visual prompts** (points, scribbles, lassos, bounding boxes) and **text prompts**. Visual prompts are described below; text-prompt segmentation has its own subsection with usage and important notices.

#### Visual prompts

The tool provides four visual prompt types for segmentation (shown in red boxes from left to right):

<img src="docs/images/tools.png" alt="Segmentation Tools" width="700">

- **Point**: Click to indicate what you want to segment  
- **Scribble**: Paint over the structure to include  
- **Lasso**: Draw around and surround the structure inside the lasso  
- **Bounding Box**: Draw a rectangular box to surround the target structure  

<a href="docs/images/all_prompts.png" target="_blank">
  <img src="docs/images/all_prompts.png" alt="All Prompts Example" width="700">
</a>

#### Model selection

Choose which segmentation model to use:

- **nnInteractive**: Supports all prompt types (point, scribble, lasso, bounding box)  
- **SAM2/MedSAM2/SAM3**: Currently supports positive/negative points and positive bounding boxes only

💡 Based on preliminary internal testing, nnInteractive provides faster inference and generally feels more real-time and accurate in typical clinical image segmentation tasks.

#### Running inference

After providing prompts and choosing the model, you can run inference by clicking the inference button located next to the red box:

**Live Mode**: To avoid manually clicking the inference button each time, enable **Live Mode**. Once enabled, the model will automatically segment the target structure on every prompt you provide.

💡 For all models, a single prompt (for example, a point or scribble on one slice) automatically propagates the segmentation across the entire 3D image stack, enabling volumetric segmentation from minimal user input.

<a href="docs/images/output.png" target="_blank">
  <img src="docs/images/output.png" alt="Output" width="700">
</a>

#### Positive and negative prompts

You can exclude certain structures from your segmentation by toggling on the **neg.** (negative) button before providing prompts.

**Negative Scribble Example:**  
<a href="docs/images/scribble_pos_neg.png" target="_blank">
  <img src="docs/images/scribble_pos_neg.png" alt="Neg Scribble Example" width="700">
</a>

**Negative Point Example:**  
<a href="docs/images/point_pos_neg.png" target="_blank">
  <img src="docs/images/point_pos_neg.png" alt="Neg Point Example" width="700">
</a>

#### Refine vs. new segment

Use the **Refine/New** toggle to control segmentation behavior:

- **Refine**: Keep refining the current segment with additional prompts  
- **New**: Create a new, separate segment  

💡 You can revisit any existing segment at any time by selecting it from the segmentation list — once selected, new prompts will continue refining that specific segmentation interactively.

#### Text-prompt segmentation

**VoxTell** is part of the segmentation workflow: it produces segmentations from **free-form text** instead of visual prompts. Describe the structure or region you want to segment in natural language.

- **Replace current segment** – Use your text prompt to replace the currently selected segment.
- **Add segment label** – Create an additional segment with a new label from your text prompt.

**Notices:**

- ⚠️ **Cross-usage with nnInteractive** — Not supported yet (e.g., VoxTell → nnInteractive). Use VoxTell and nnInteractive in separate workflows.

<a href="docs/images/text_prompt.png" target="_blank">
  <img src="docs/images/text_prompt.png" alt="Text-Prompt Segmentation (VoxTell)" width="700">
</a>

**VoxTell demo:**

<a href="https://youtu.be/NOajvjTfGnU" target="_blank">
  <img src="https://img.youtube.com/vi/NOajvjTfGnU/maxresdefault.jpg" alt="VoxTell Demo" width="700">
</a>

### Report generation

**Medgemma 1.5 4B** generates radiology-style reports from 3D medical images (CT/MRI). This is separate from segmentation and adds AI-assisted reporting to OHIF-AI.

- **Instruction** – Define the broad role of Medgemma (e.g., “You are a radiology assistant”) so the model follows your intended style and scope.
- **Query** – Ask specifically what you want in the report (e.g., findings, impressions, or a full report).
- **Slice range** – Specify the **slice range** of the 3D volume to include (e.g., slices 10–50) so the report is based on the relevant portion of the CT or MRI stack.

Use the Medgemma panel to set Instruction, Query, and slice range, then run inference to generate the report.

**Notice:**

- ⚠️ **GPU / VRAM** — MedGemma uses ~35 GB VRAM. Use one large GPU for all models, or a dedicated GPU for MedGemma by setting `device_map={"": "cuda:1"}` (or another device ID) in `monai-label/monailabel/tasks/infer/basic_infer.py`.

<a href="docs/images/medgemma.png" target="_blank">
  <img src="docs/images/medgemma.png" alt="Report Generation (Medgemma 1.5 4B)" width="700">
</a>

**VoxTell + MedGemma demo:**

<a href="https://youtu.be/Rl-LKu_wWMQ" target="_blank">
  <img src="https://img.youtube.com/vi/Rl-LKu_wWMQ/maxresdefault.jpg" alt="VoxTell + MedGemma Demo" width="700">
</a>

---

## 🧭 System architecture & segmentation data flow

This section documents how OHIF-AI stitches the viewer, AI backends, and segmentation tooling together. It is meant as a practical, code-referenced map for debugging and future changes.

### Runtime services and routing

- **Docker Compose** runs three main services: OHIF web UI, Orthanc PACS, and MONAI Label inference. The entry point is [docker-compose.yml](docker-compose.yml).
- **Reverse proxy routing** lives in [Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf](Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf).
  - `/monai/*` → `monai_sam2:8002`
  - `/pacs/*` → Orthanc
- The UI calls `/monai` and `/pacs` via the browser; the UI chooses `/ohif/monai` when running under `/ohif` base path.

### Frontend segmentation flow (prompt → mask → labelmap)

- **AI command entrypoint**: [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts)
  - Collects prompts (points, boxes, scribbles).
  - Sends multipart requests to `/monai/infer/segmentation`.
  - Decodes segmentation masks and writes them into labelmap images.
  - Calls `postSegmentationProcessing()` to update segmentation state and viewports.
- **Prompt transport**: [Viewers/extensions/monai-label/src/services/MonaiLabelClient.js](Viewers/extensions/monai-label/src/services/MonaiLabelClient.js)
  - Sends params as multipart `params` (JSON + binary payloads).

### Backend segmentation flow (inference → output)

- **Model orchestration**: [monai-label/monailabel/tasks/infer/basic_infer.py](monai-label/monailabel/tasks/infer/basic_infer.py)
  - Routes `nnInteractive`, `sam2`, `medsam2`, `sam3`, and baseline thresholding.
  - Writes masks that the UI ingests as labelmaps.
- **Capabilities** are served at `/monai/info` from [monai-label/monailabel/interfaces/app.py](monai-label/monailabel/interfaces/app.py) and used to show/hide toolboxes in the UI.

### Segmentation state + editing (Cornerstone)

- **SegmentationService** (Cornerstone integration): [Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts](Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts)
  - `createLabelmapForDisplaySet()` creates a labelmap segmentation with derived images.
  - `addOrUpdateSegmentation()` updates segmentation state and representation data.
  - `addSegmentationRepresentation()` attaches labelmap rendering to a viewport.
  - `setActiveSegmentation()` and `setActiveSegment()` determine which segment tools edit.
- **Tooling/UI**:
  - `toolboxState` is the single source of truth for AI prompt settings: [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts).
  - The AI tool UI is in [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx).
  - AI modes and toolbar buttons are registered in [Viewers/modes/longitudinal/src/index.ts](Viewers/modes/longitudinal/src/index.ts) and [Viewers/modes/longitudinal/src/toolbarButtons.ts](Viewers/modes/longitudinal/src/toolbarButtons.ts).

### Known invariants for segmentation editing

Legacy tools (Brush/Eraser/etc.) depend on **three conditions** being true:

1. A labelmap segmentation exists in Cornerstone state (created via `createLabelmapForDisplaySet()` or a properly formed `addOrUpdateSegmentation()` call).
2. The labelmap representation for that segmentation is attached to the active viewport.
3. The active segmentation + segment are set to the target segment (`setActiveSegmentation()` + `setActiveSegment()`).

When any of these is missing or out-of-sync, legacy tools appear enabled but will not modify the segmentation.

---

## 🧾 Branch development summary & known issues

This section summarizes **all changes on the porosity branch vs main**, and documents the **current unresolved issues** and **mitigations attempted so far**. It is based on git history, diffs, and the work described in this chat.

### What changed in this branch (purpose + rationale)

**Deployment & routing**
- **/ohif-aware routing and proxying**: normalized public base path handling so the UI can run under `/ohif` while still calling MONAI/Orthanc correctly. Touches [docker-compose.yml](docker-compose.yml), [Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf](Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf), and [Viewers/platform/app/public/config/docker-nginx-orthanc.js](Viewers/platform/app/public/config/docker-nginx-orthanc.js).
- **Startup stability**: updated [start.sh](start.sh) to manage clean startup and persistence options; added minor Dockerfile adjustments for image build consistency.

**Backend inference + capabilities**
- **Baseline segmentation**: added baseline thresholding (otsu/percentile/adaptive) and related parameters in [monai-label/monailabel/tasks/infer/basic_infer.py](monai-label/monailabel/tasks/infer/basic_infer.py).
- **Prompt/seed handling**: applied seed masks before SAM interactions; added optional current-mask seeding and payload size mismatch warnings.
- **Capability flags**: exposed VoxTell/MedGemma/baseline availability via [monai-label/monailabel/interfaces/app.py](monai-label/monailabel/interfaces/app.py) for UI gating.

**Frontend AI UX + controls**
- **Porosity toolbox**: added UI controls and settings for baseline tuning, seed masks, and model selection in [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx) and [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts).
- **Toolbar wiring**: added/updated buttons and mode registration for porosity tooling in [Viewers/modes/longitudinal/src/index.ts](Viewers/modes/longitudinal/src/index.ts) and [Viewers/modes/longitudinal/src/toolbarButtons.ts](Viewers/modes/longitudinal/src/toolbarButtons.ts).
- **Capability-gated panels**: optional toolboxes only show when `/monai/info` advertises support in [Viewers/extensions/cornerstone/src/getPanelModule.tsx](Viewers/extensions/cornerstone/src/getPanelModule.tsx).

**Segmentation processing + exports**
- **Labelmap handling + post-processing**: extensive updates in [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts) to reuse active segmentation, stabilize segment indices, manage label/metadata, and refine labelmap representation updates.
- **TIFF export pipeline**: added valid TIFF export and metadata fixes in [Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts](Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts), [Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx](Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx), and [Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx](Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx).

**Legacy tool support adjustments**
- **Tool activation + visibility**: multiple changes to restore legacy measurements and re-enable tools after AI runs (e.g., active tool restore, unlocks, segment activation, visibility recovery).
- **Representation consistency**: forced labelmap representation presence and rebinds to avoid stale viewport bindings after AI updates.

### Current known issues (as of 13. května 2026)

1. **Legacy tools do not edit AI/baseline segments**
  - **Symptom**: Brush/Eraser/Threshold appear active but do not modify the labelmap in segments created or refined by AI/baseline inference.
  - **Scope**: Occurs even for newly created segments after AI runs; manual segments behave normally.

2. **Negative prompts are unreliable**
  - **Symptom**: Negative points/boxes sometimes fail to exclude regions or do not propagate correctly when mixed with other prompt types.
  - **Scope**: Most visible with SAM variants and when switching between prompt types.

3. **Seed mask refinement is inconsistent**
  - **Symptom**: Seed-only or refine-from-mask workflows can yield no-op results or overwrite unintended slices.
  - **Scope**: Impacts baseline → SAM refinements and long refinement sessions.

4. **Other prompt types (scribble/lasso) remain fragile**
  - **Symptom**: Prompt conversions can be rejected or produce unexpected masks; some prompt types are intentionally disabled for SAM models, but UX is still confusing.

### Remediations attempted so far (complete list)

**Segmentation state + representation fixes**
- Reused the **active segmentation** instead of always creating new ones.
- Ensured **active segmentation + segment** are reasserted after AI runs.
- Added **segment creation** if the target segment was missing in the segmentation state.
- Enforced **labelmap representation** for AI-generated masks, and reattached it to the active viewport.
- Removed stale labelmap representations and re-added them when labelmap references changed.
- Updated labelmap **representation data** (imageIds, referencedImageIds) for existing segmentations, not only for new ones.
- Refreshed labelmap image references after AI updates to keep stack viewports editable.
- Rebound tool groups to active viewports to avoid stale tool-to-viewport binding.

**Tool visibility + state restores**
- Restored **legacy measurements** after AI runs.
- Restored the **previous active tool** (e.g., Brush/Eraser) after inference completes.
- Unlocked AI tooling after commands complete to avoid hidden locks.

**Prompt handling + backend alignment**
- Added **negative prompt masking** support in SAM and blocked unsupported prompt conversions.
- Added **seed-mask handling** before SAM prompt processing in the backend.
- Added **baseline controls** (threshold method, sigma, percentile, local block sizes) with UI hints and safer defaults.
- Hardened **mask payload decoding** and flip-order handling to reduce silent corruption.

**Exports + metadata correctness**
- Ensured TIFF exports write valid tags and preserve segment indices.
- Updated SEG export logic to avoid metadata/segment index mismatch.

### Why legacy tools are still failing (working hypothesis)

The segmentation state appears valid in UI, but legacy tools likely bind to **stale labelmap references** or **representation state** after AI writes masks directly into derived labelmap images. The most likely failure points are:

- **Representation imageIds** not matching the updated derived labelmap images after inference.
- **Viewport representation bindings** not fully refreshed after in-place labelmap updates.
- **Segment active state** desynchronized from the segmentation state used by tools.

These hypotheses match the symptom where segmentation renders correctly but tools do not modify the labelmap.

---

## 🧭 Porosity branch review (porosity vs main)

This section tracks issues found while comparing the porosity branch to main, plus a consolidated plan to fix them in a minimal, well‑integrated way.

### Problems observed (status)

- [Resolved] Baseline segmentation can create a new segmentation container with a blank label because the current series label is empty and the matching logic relies on `cachedStats.seriesInstanceUid`/`algorithmType`, which are often missing for manual segmentations. The baseline action should update the active segmentation/segment instead of branching into a new container. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).
- [Resolved] The Seed Mask toggle does not actually disable mask seeding when refining the current segment. `useMaskSeed` is forced to `true` whenever `Refine` is active, making the toggle ineffective. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts), [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx), and [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts).
- [Resolved] Legacy tools (Brush/Eraser/Threshold) can appear enabled but do nothing on AI/baseline segments because the pipeline mutates `csToolsSegmentation` directly and can desynchronize the `SegmentationService` and tool groups. This is the most likely cause of “tools do nothing” after AI/baseline runs. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts), [Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts](Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts), and [Viewers/modes/longitudinal/src/toolbarButtons.ts](Viewers/modes/longitudinal/src/toolbarButtons.ts). (Pending verification in UI.)
- [Resolved] Segmentation payload decoding and measurement hide/restore logic is duplicated in multiple branches (`sam2`/`nninter`), increasing maintenance and raising the risk of inconsistent behavior. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).
- [Resolved] DICOM SEG export reindexes `SegmentNumber` without remapping the labelmap pixel values, which can cause metadata-to-pixel mismatches for non-contiguous segment indices. See [Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts](Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts).
- [Resolved] Export gating now sets `isExportable: true` universally, which can surface DICOM export options even when reconstruction is not possible. TIFF exports are fine, but DICOM SEG should remain gated. See [Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx](Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx).
- [Resolved] Default model changed to `medsam2` and new porosity toolbox defaults alter behavior versus main; this should be intentional and explicitly communicated. See [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts) and [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx).

### Plan to fix (minimal + coherent)

1. **Unify segmentation targeting**: implement a single helper that resolves the active segmentation/segment and always reuses it unless the user explicitly selects New. Ensure `cachedStats.seriesInstanceUid` is set on segmentation creation and fall back to a safe label when `SeriesDescription` is empty. Apply this to baseline and AI flows. **Status: Done**.
2. **Make Seed Mask toggle effective**: compute `useMaskSeed` from the toggle even in `Refine` mode, and explicitly override only in `propagateCurrentMask` (which should force mask seeding). Update UI hints to reflect when mask seeding is forced. **Status: Done**.
3. **Restore legacy tool compatibility**: stop mutating `csToolsSegmentation` directly and instead update through `SegmentationService` APIs, keeping tool groups and active segmentation state consistent. Avoid `clearSegmentationRepresentations` unless necessary; when used, re-add representations through the service for all viewports. **Status: Done (verify in UI)**.
4. **Deduplicate inference post-processing**: extract payload decoding and measurement hide/restore into shared helpers so `sam2` and `nninter` follow identical logic, reducing regressions. **Status: Done**.

5. **Fix export correctness**: keep TIFF exports always available but gate DICOM SEG exports on reconstructability; if segment indices are renumbered, remap pixel values to match metadata or retain original indices. **Status: Done**.
6. **Explicit defaults and UX**: confirm whether `medsam2` should be the default model and document the rationale; otherwise revert to the previous default or make it user-configurable. **Status: Done (reverted to nnInteractive)**.

### Pull request change summary

This PR focuses on aligning AI/baseline workflows with legacy segmentation tools, improving export correctness, and reducing post‑processing duplication.

#### Segmentation flow consistency
- Reuse active segmentation/segment for baseline and refine flows (prevents blank/extra segmentations). See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).
- Segmentation creation/updates now go through `SegmentationService.addOrUpdateSegmentation`, reducing desynchronization risks with tool groups. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).
- Baseline respects active segment selection and ensures segmentation labels fallback to a safe value when `SeriesDescription` is empty. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).

#### Mask seeding + prompt handling
- Seed Mask toggle now directly controls `use_mask_seed` in SAM requests; `propagateCurrentMask` still forces seeds. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).
- Mask seeds are built from the active segment’s labelmap (prompt slices or top non‑empty slices), sent as `seed_masks`, and merged with prompt masks in backend. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts) and [monai-label/monailabel/tasks/infer/basic_infer.py](monai-label/monailabel/tasks/infer/basic_infer.py).

#### Post‑processing simplification
- Consolidated measurement hide/restore logic and payload size warnings through shared helpers to keep SAM and nnInteractive behavior consistent. See [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts).

#### Export correctness
- DICOM SEG export keeps original `SegmentNumber` to avoid metadata/pixel mismatches. See [Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts](Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts).
- DICOM export gating is restored (TIFF still allowed if labelmap exists). See [Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx](Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx) and [Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx](Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx).

#### Defaults + UX
- Default model restored to `nnInteractive`. See [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts).

### Branch diff audit (main → porosity)

Each entry lists the change, its purpose, and whether it is correct and necessary.

- [.dockerignore](.dockerignore): New restrictive Docker context (allows only monai-label/sam2/sam3 trees; excludes caches/IDE files). Purpose: speed/size reduction for backend image builds. **Correct: yes. Necessary: yes for faster/cleaner builds.**
- [.gitignore](.gitignore): Ignore Copilot instructions and development summary artifacts. Purpose: keep local assistant files out of git. **Correct: yes. Necessary: yes for repo hygiene.**
- [README.md](README.md): Added porosity review, status, warnings, and PR summary. Purpose: document decisions and changes. **Correct: yes. Necessary: yes for traceability.**
- [Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts](Viewers/extensions/cornerstone-dicom-seg/src/commandsModule.ts): Added multi‑page TIFF export (`downloadSegmentationAsAllSlicesTiff`) and TIFF writer helpers. Purpose: provide non‑DICOM export for downstream tools like Fiji/ImageJ. **Correct: yes. Necessary: yes for TIFF export use case.**
- [Viewers/extensions/cornerstone/src/commandsModule.ts](Viewers/extensions/cornerstone/src/commandsModule.ts): Added guardrails for bidirectional/interpolation without active segment; sync toolbox active segment after add/select. Purpose: prevent no‑op commands and keep toolbox state in sync. **Correct: yes. Necessary: yes for consistent UX.**
- [Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx](Viewers/extensions/cornerstone/src/customizations/CustomDropdownMenuContent.tsx): Export gating split into DICOM vs TIFF; wired TIFF export command. Purpose: prevent invalid DICOM export while allowing TIFF. **Correct: yes. Necessary: yes for export correctness.**
- [Viewers/extensions/cornerstone/src/getPanelModule.tsx](Viewers/extensions/cornerstone/src/getPanelModule.tsx): Optional toolboxes based on `/monai/info` capabilities; added Porosity toolbox; renamed titles. Purpose: hide unavailable tools and add porosity controls. **Correct: yes. Necessary: yes for capability‑driven UI.**
- [Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx](Viewers/extensions/cornerstone/src/panels/PanelSegmentation.tsx): DICOM export gating restored; TIFF export exposed. Purpose: correct DICOM export availability. **Correct: yes. Necessary: yes.**
- [Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts](Viewers/extensions/cornerstone/src/services/SegmentationService/SegmentationService.ts): `getActiveSegment` prefers segment‑index active segment; `setActiveSegment` updates segment active flags. Purpose: align active segment with tool expectations. **Correct: yes. Necessary: yes for legacy tool stability.**
- [Viewers/extensions/default/src/commandsModule.ts](Viewers/extensions/default/src/commandsModule.ts): Major updates: monai base path support; baseline segmentation and mask propagation commands; expanded prompt types; mask seed extraction + submission; segmentation reuse rules; payload decode helpers; measurement hide/restore dedupe; tool restore + unlock; label fallback; SegmentationService updates. Purpose: enable baseline workflow and keep legacy tools functional. **Correct: yes. Necessary: yes for required features.**
- [Viewers/extensions/default/src/stores/toolboxState.ts](Viewers/extensions/default/src/stores/toolboxState.ts): Baseline parameters + mask seed toggle state; default model set to `nnInteractive`; refine side‑effects removed from state setter. Purpose: support new UI controls and avoid hidden side effects. **Correct: yes. Necessary: yes.**
- [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx): UI controls for baseline thresholds and Seed Mask toggle; porosity toolbox lock behavior; layout tweaks. Purpose: expose baseline configuration and seeding control. **Correct: yes. Necessary: yes.**
- [Viewers/modes/longitudinal/src/index.ts](Viewers/modes/longitudinal/src/index.ts): Added porosity/toolbox sections; backend‑capability toolboxes. Purpose: wire new toolboxes into the mode. **Correct: yes. Necessary: yes for UI wiring.**
- [Viewers/modes/longitudinal/src/toolbarButtons.ts](Viewers/modes/longitudinal/src/toolbarButtons.ts): New porosity buttons; setToolActiveToolbar for brush/eraser/threshold; add container button. Purpose: expose baseline/propagate and fix tool activation. **Correct: yes. Necessary: yes for UX and legacy tools.**
- [Viewers/platform/app/.env](Viewers/platform/app/.env): `PUBLIC_URL=/ohif/`. Purpose: serve UI under `/ohif`. **Correct: yes. Necessary: yes for reverse‑proxy path.**
- [Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf](Viewers/platform/app/.recipes/Nginx-Orthanc/config/nginx.conf): `/ohif` base path support; `/pacs` + `/monai` rewrites; compatibility shim for `/ohif-` paths; larger body size and CORS. Purpose: correct routing when hosted under `/ohif`. **Correct: yes. Necessary: yes for deployment.**
- [Viewers/platform/app/.recipes/Nginx-Orthanc/dockerfile](Viewers/platform/app/.recipes/Nginx-Orthanc/dockerfile): build arg for `PUBLIC_URL`. Purpose: configure app base path at build. **Correct: yes. Necessary: yes with `/ohif` hosting.**
- [Viewers/platform/app/public/config/docker-nginx-orthanc.js](Viewers/platform/app/public/config/docker-nginx-orthanc.js): dynamic `routerBasename` + PACS roots based on `/ohif`. Purpose: client config matches proxy base path. **Correct: yes. Necessary: yes.**
- [Viewers/platform/core/src/hooks/useToolbar.tsx](Viewers/platform/core/src/hooks/useToolbar.tsx): allow string commands with `commandOptions` to execute via wrapper. Purpose: toolbar buttons can pass options. **Correct: yes. Necessary: yes for new brush/eraser bindings.**
- [docker-compose.yml](docker-compose.yml): persist volumes under `PERSIST_ROOT`; avoid pulling images; build `PUBLIC_URL`; monai startup ensures apps/weights; environment flags for MedGemma/VoxTell. Purpose: stable persistence and controlled startup. **Correct: yes. Necessary: yes for reliable runtime.**
- [monai-label/Dockerfile](monai-label/Dockerfile): consolidated pip install; removed baked‑in weights/app download; disable pip cache. Purpose: faster and reproducible container. **Correct: yes. Necessary: yes for clean builds.**
- [monai-label/monailabel/interfaces/app.py](monai-label/monailabel/interfaces/app.py): expose `capabilities` in `/monai/info` using env flags. Purpose: frontend can hide unsupported tools. **Correct: yes. Necessary: yes for capability gating.**
- [monai-label/monailabel/tasks/infer/basic_infer.py](monai-label/monailabel/tasks/infer/basic_infer.py): baseline porosity pipeline; optional VoxTell/MedGemma; additional prompt types; mask seeding; improved slice order handling; safety checks. Purpose: implement baseline + richer prompts while keeping SAM stable. **Correct: yes. Necessary: yes for backend features.**
- [start.sh](start.sh): structured startup with caching, persistent storage prep, selective builds, and safe defaults. Purpose: reproducible startup without unnecessary rebuilds. **Correct: yes. Necessary: yes for consistent dev workflow.**
