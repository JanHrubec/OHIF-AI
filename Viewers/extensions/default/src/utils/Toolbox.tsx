import React, { useState, useEffect, useRef } from 'react';
import { Icons, PanelSection, ToolSettings, Switch, Label, Select, SelectTrigger, SelectValue, SelectContent, SelectItem, Button, Input } from '@ohif/ui-next';
import { Lock, LockOpen } from 'lucide-react';
import { useSystem, useToolbar } from '@ohif/core';
import classnames from 'classnames';
import { useTranslation } from 'react-i18next';
import { toolboxState } from '../stores/toolboxState';

interface ButtonProps {
  isActive?: boolean;
  options?: unknown;
}

type BaselineThresholdMethod = 'otsu' | 'percentile' | 'adaptive_mean';

/**
 * A toolbox is a collection of buttons and commands that they invoke, used to provide
 * custom control panels to users. This component is a generic UI component that
 * interacts with services and commands in a generic fashion. While it might
 * seem unconventional to import it from the UI and integrate it into the JSX,
 * it belongs in the UI components as there isn't anything in this component that
 * couldn't be used for a completely different type of app. It plays a crucial
 * role in enhancing the app with a toolbox by providing a way to integrate
 * and display various tools and their corresponding options
 */
export function Toolbox({ buttonSectionId, title, defaultOpen = true }: { buttonSectionId: string; title: string; defaultOpen?: boolean }) {
  const { servicesManager, commandsManager } = useSystem();
  const { t } = useTranslation();

  const { toolbarService, customizationService } = servicesManager.services;
  const isAIToolBox = buttonSectionId === 'aiToolBox';
  const isPorosityToolbox = buttonSectionId === 'porosityToolbox';
  const isTextPromptToolbox = buttonSectionId === 'textPromptSegmentationToolbox';
  const isTestMedgemmaToolbox = buttonSectionId === 'testMedgemmaToolbox';
  const [showConfig, setShowConfig] = useState(false);
  const [isLocked, setIsLocked] = useState(toolboxState.getLocked());
  const hotkeysDisabled = (isAIToolBox || isPorosityToolbox) && isLocked;

  // Local state for UI updates
  const [liveMode, setLiveMode] = useState(toolboxState.getLiveMode());
  const [posNeg, setPosNeg] = useState(toolboxState.getPosNeg());
  const [refineNew, setRefineNew] = useState(toolboxState.getRefineNew());
  const [textPromptReplaceNew, setTextPromptReplaceNew] = useState(toolboxState.getTextPromptReplaceNew());
  const [selectedModel, setSelectedModel] = useState<'nnInteractive' | 'sam2' | 'medsam2' | 'sam3'>(toolboxState.getSelectedModel());
  const [baselineThresholdMethod, setBaselineThresholdMethod] = useState<BaselineThresholdMethod>(toolboxState.getBaselineThresholdMethod());
  const [baselineSigma, setBaselineSigma] = useState<number>(toolboxState.getBaselineSigma());
  const [baselineClipQuantile, setBaselineClipQuantile] = useState<number>(toolboxState.getBaselineClipQuantile());
  const [baselineThresholdScale, setBaselineThresholdScale] = useState<number>(toolboxState.getBaselineThresholdScale());
  const [baselinePercentile, setBaselinePercentile] = useState<number>(toolboxState.getBaselinePercentile());
  const [baselineLocalBlockSize, setBaselineLocalBlockSize] = useState<number>(toolboxState.getBaselineLocalBlockSize());
  const [baselineLocalOffset, setBaselineLocalOffset] = useState<number>(toolboxState.getBaselineLocalOffset());
  const [useCurrentMaskAsSeed, setUseCurrentMaskAsSeed] = useState<boolean>(toolboxState.getUseCurrentMaskAsSeed());
  const [medgemmaResult, setMedgemmaResult] = useState(toolboxState.getMedgemmaResult());
  const [medgemmaInstruction, setMedgemmaInstruction] = useState(toolboxState.getMedgemmaInstruction());
  const [medgemmaQuery, setMedgemmaQuery] = useState(toolboxState.getMedgemmaQuery());
  const [medgemmaStartSlice, setMedgemmaStartSlice] = useState<number | null>(toolboxState.getMedgemmaStartSlice());
  const [medgemmaEndSlice, setMedgemmaEndSlice] = useState<number | null>(toolboxState.getMedgemmaEndSlice());
  
  // Sync medgemma state from toolboxState
  useEffect(() => {
    if (isTestMedgemmaToolbox) {
      const interval = setInterval(() => {
        const result = toolboxState.getMedgemmaResult();
        const instruction = toolboxState.getMedgemmaInstruction();
        const query = toolboxState.getMedgemmaQuery();
        const startSlice = toolboxState.getMedgemmaStartSlice();
        const endSlice = toolboxState.getMedgemmaEndSlice();
        setMedgemmaResult(result);
        setMedgemmaInstruction(instruction);
        setMedgemmaQuery(query);
        setMedgemmaStartSlice(startSlice);
        setMedgemmaEndSlice(endSlice);
      }, 100); // Check every 100ms for updates
      return () => clearInterval(interval);
    }
  }, [isTestMedgemmaToolbox]);

  // Sync local state with global state changes
  useEffect(() => {
    const updateLocalState = () => {
      setLiveMode(toolboxState.getLiveMode());
      setPosNeg(toolboxState.getPosNeg());
      setRefineNew(toolboxState.getRefineNew());
      setTextPromptReplaceNew(toolboxState.getTextPromptReplaceNew());
      setSelectedModel(toolboxState.getSelectedModel());
      setBaselineThresholdMethod(toolboxState.getBaselineThresholdMethod());
      setBaselineSigma(toolboxState.getBaselineSigma());
      setBaselineClipQuantile(toolboxState.getBaselineClipQuantile());
      setBaselineThresholdScale(toolboxState.getBaselineThresholdScale());
      setBaselinePercentile(toolboxState.getBaselinePercentile());
      setBaselineLocalBlockSize(toolboxState.getBaselineLocalBlockSize());
      setBaselineLocalOffset(toolboxState.getBaselineLocalOffset());
      setUseCurrentMaskAsSeed(toolboxState.getUseCurrentMaskAsSeed());
      setIsLocked(toolboxState.getLocked());
    };

    // Update immediately
    updateLocalState();

    // Set up an interval to check for changes (since toolboxState doesn't have events)
    const interval = setInterval(updateLocalState, 100);

    return () => clearInterval(interval);
  }, []);

  // Keyboard hotkey handler for Live Mode toggle
  useEffect(() => {
    if (hotkeysDisabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is 'Q' or 'q'
      if ((event.key === 'Q' || event.key === 'q')) {
        // Only trigger if we're not typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
        
        if (!isInputField) {
          event.preventDefault();
          const newLiveMode = !liveMode;
          setLiveMode(newLiveMode);
          toolboxState.setLiveMode(newLiveMode);
          console.log('Live mode toggled via hotkey (q):', newLiveMode);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [liveMode, hotkeysDisabled]);

  // Keyboard hotkey handler for Pos/Neg toggle
  useEffect(() => {
    if (hotkeysDisabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is 'W' or 'w'
      if ((event.key === 'W' || event.key === 'w')) {
        // Only trigger if we're not typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
        
        if (!isInputField) {
          event.preventDefault();
          const newPosNeg = !posNeg;
          setPosNeg(newPosNeg);
          toolboxState.setPosNeg(newPosNeg);
          console.log('Pos/Neg toggled via hotkey (w):', newPosNeg);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [posNeg, hotkeysDisabled]);

  // Keyboard hotkey handler for Refine/New toggle
  useEffect(() => {
    if (hotkeysDisabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is 'E' or 'e'
      if ((event.key === 'E' || event.key === 'e')) {
        // Only trigger if we're not typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
        
        if (!isInputField) {
          event.preventDefault();
          const newRefineNew = !refineNew;
          setRefineNew(newRefineNew);
          toolboxState.setRefineNew(newRefineNew);
          console.log('Refine/New toggled via hotkey (e):', newRefineNew);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [refineNew, hotkeysDisabled]);

  // When locked, force Pan tool active, disable live prompts, and collapse section
  useEffect(() => {
    if (isLocked) {
      try {
        // Disable live mode to avoid unintended inference
        if (liveMode) {
          setLiveMode(false);
          toolboxState.setLiveMode(false);
        }
        // Activate Pan tool
        commandsManager?.run?.('setToolActive', { toolName: 'Pan' });
      } catch (e) {
        // no-op
      }
    }
  }, [isLocked]);

  // Keyboard hotkey handler for model selection toggle (cycles through: nnInteractive -> sam2 -> medsam2 -> sam3 -> nnInteractive)
  useEffect(() => {
    if (hotkeysDisabled) {
      return;
    }

    const handleKeyDown = (event: KeyboardEvent) => {
      // Check if the pressed key is 'T' or 't'
      if ((event.key === 'T' || event.key === 't')) {
        // Only trigger if we're not typing in an input field
        const activeElement = document.activeElement;
        const isInputField = activeElement?.tagName === 'INPUT' || 
                           activeElement?.tagName === 'TEXTAREA' || 
                           (activeElement as HTMLElement)?.contentEditable === 'true';
        
        if (!isInputField) {
          event.preventDefault();
          // Cycle through models: nnInteractive -> sam2 -> medsam2 -> sam3 -> nnInteractive
          const nextModel = selectedModel === 'nnInteractive' ? 'sam2' : 
                           selectedModel === 'sam2' ? 'medsam2' :
                           selectedModel === 'medsam2' ? 'sam3' :
                           'nnInteractive';
          setSelectedModel(nextModel);
          toolboxState.setSelectedModel(nextModel);
          console.log('Model selection toggled via hotkey (t):', nextModel);
        }
      }
    };

    // Add event listener
    document.addEventListener('keydown', handleKeyDown);

    // Cleanup
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [selectedModel, hotkeysDisabled]);

  const { toolbarButtons: toolboxSections, onInteraction } = useToolbar({
    servicesManager,
    buttonSection: buttonSectionId,
  });

  if (!toolboxSections.length) {
    return null;
  }

  // Ensure we have proper button sections at the top level.
  if (!toolboxSections.every(section => section.componentProps.buttonSection)) {
    throw new Error(
      'Toolbox accepts only button sections at the top level, not buttons. Create at least one button section.'
    );
  }

  // Helper to check a list of buttons for an active tool.
  const findActiveOptions = (buttons: any[]): unknown => {
    for (const tool of buttons) {
      if (tool.componentProps.isActive) {
        return tool.componentProps.options;
      }
      if (tool.componentProps.buttonSection) {
        const nestedButtons = toolbarService.getButtonPropsInButtonSection(
          tool.componentProps.buttonSection
        ) as ButtonProps[];
        const activeNested = nestedButtons.find(nested => nested.isActive);
        if (activeNested) {
          return activeNested.options;
        }
      }
    }
    return null;
  };

  // Look for active tool options across all sections.
  const activeToolOptions = toolboxSections.reduce((activeOptions, section) => {
    if (activeOptions) {
      return activeOptions;
    }
    const sectionId = section.componentProps.buttonSection;
    const buttons = toolbarService.getButtonSection(sectionId);
    return findActiveOptions(buttons);
  }, null);

  // Define the interaction handler once.
  const handleInteraction = ({ itemId }: { itemId: string }) => {
    if ((isAIToolBox || isPorosityToolbox) && isLocked && itemId !== 'Pan') {
      // Prevent tool changes when locked; keep Pan active
      commandsManager?.run?.('setToolActive', { toolName: 'Pan' });
      return;
    }
    onInteraction?.({ itemId });
  };

  const CustomConfigComponent = customizationService.getCustomization(`${buttonSectionId}.config`);
  const shouldCollapse = (isAIToolBox || isPorosityToolbox) && isLocked;

  return (
    <PanelSection key={(isAIToolBox || isPorosityToolbox) ? `toolbox-${buttonSectionId}-${isLocked}` : buttonSectionId} defaultOpen={defaultOpen && !shouldCollapse}>
      <PanelSection.Header 
        className="flex items-center justify-between"
      >
        <span className={classnames("flex items-center gap-2", { 
          "pointer-events-none": shouldCollapse 
        })}>
          <span className="pointer-events-auto">{t(title)}</span>
          {(isAIToolBox || isPorosityToolbox) && (
            <button
              type="button"
              className={classnames('ml-auto h-5 w-5 text-primary hover:opacity-80 pointer-events-auto cursor-pointer')}
              onClick={e => {
                e.stopPropagation();
                const next = !isLocked;
                setIsLocked(next);
                toolboxState.setLocked(next);
                if (next) {
                  commandsManager?.run?.('setToolActive', { toolName: 'Pan' });
                }
              }}
              aria-label={isLocked ? 'Unlock tools' : 'Lock tools'}
              title={isLocked ? 'Unlock tools' : 'Lock tools'}
            >
              {isLocked ? <Lock className="h-4 w-4" /> : <LockOpen className="h-4 w-4" />}
            </button>
          )}
        </span>
        {CustomConfigComponent && (
          <div className="ml-auto mr-2">
            <Icons.Settings
              className="text-primary h-4 w-4"
              onClick={e => {
                e.stopPropagation();
                setShowConfig(!showConfig);
              }}
            />
          </div>
        )}
      </PanelSection.Header>

      {!shouldCollapse && (
      <PanelSection.Content className="bg-muted flex-shrink-0 border-none">
        {showConfig && <CustomConfigComponent />}
        {toolboxSections.map(section => {
          const sectionId = section.componentProps.buttonSection;
          const buttons = toolbarService.getButtonSection(sectionId) as any[];

          return (
            <React.Fragment key={sectionId}>
              {isAIToolBox && (
                <div className="flex flex-wrap justify-center items-center gap-3 py-2 px-1">
                   <div className="flex items-center gap-2">
                     <Label htmlFor="live-mode">Live Mode</Label>
                     <Switch
                       id="live-mode"
                       checked={liveMode}
                       onCheckedChange={(checked) => {
                        setLiveMode(checked);
                        toolboxState.setLiveMode(checked);
                        console.log('Live mode:', checked);
                       }}
                     />
                   </div>
                   <div className="flex items-center gap-2">
                     <Label htmlFor="pos-neg">Pos/Neg</Label>
                     <Switch
                       id="pos-neg"
                       checked={posNeg}
                       onCheckedChange={(checked) => {
                        setPosNeg(checked);
                        toolboxState.setPosNeg(checked);
                        console.log('Pos/Neg:', checked);
                      }}
                     />
                   </div>
                   <div className="flex items-center gap-2">
                     <Label htmlFor="refine-new">Refine/New</Label>
                     <Switch
                       id="refine-new"
                       checked={refineNew}
                       onCheckedChange={(checked) => {
                        setRefineNew(checked);
                        toolboxState.setRefineNew(checked);
                        console.log('Refine/New:', checked);
                      }}
                     />
                   </div>
                   <div className="flex items-center gap-2">
                     <Label
                       htmlFor="use-current-mask-seed"
                       title="Use active segment mask as initialization before prompt refinement"
                     >
                       Seed Mask
                     </Label>
                     <Switch
                       id="use-current-mask-seed"
                       checked={useCurrentMaskAsSeed}
                       disabled={refineNew}
                       onCheckedChange={(checked) => {
                        setUseCurrentMaskAsSeed(checked);
                        toolboxState.setUseCurrentMaskAsSeed(checked);
                      }}
                     />
                   </div>
                   <div className="flex items-center gap-1">
                     <Label htmlFor="model-selection" title="Segmentation model used for Run Segmentation and interactive prompts">Model</Label>
                     <Select
                       value={selectedModel}
                       onValueChange={(value) => {
                         const model = value as 'nnInteractive' | 'sam2' | 'medsam2' | 'sam3';
                         setSelectedModel(model);
                         toolboxState.setSelectedModel(model);
                         console.log('Model selection:', model);
                       }}
                     >
                       <SelectTrigger id="model-selection" className="w-[118px] h-8" title="Choose model">
                         <SelectValue placeholder="Select model" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="nnInteractive">nnInteractive</SelectItem>
                         <SelectItem value="sam2">SAM2</SelectItem>
                         <SelectItem value="medsam2">MedSAM2</SelectItem>
                         <SelectItem value="sam3">SAM3</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                 </div>
                )}
              {isPorosityToolbox && (
                <div className="flex flex-wrap items-end gap-2 py-2 px-1 text-xs">
                   <div className="flex items-center gap-1">
                     <Label htmlFor="baseline-method" title="Choose the thresholding strategy used to create the baseline mask.">Method</Label>
                     <Select
                       value={baselineThresholdMethod}
                       onValueChange={(value) => {
                         const method = value as BaselineThresholdMethod;
                         setBaselineThresholdMethod(method);
                         toolboxState.setBaselineThresholdMethod(method);
                       }}
                     >
                       <SelectTrigger id="baseline-method" className="w-[132px] h-8 text-xs" title="Choose threshold method">
                         <SelectValue placeholder="Threshold method" />
                       </SelectTrigger>
                       <SelectContent>
                         <SelectItem value="otsu">Otsu</SelectItem>
                         <SelectItem value="percentile">Percentile</SelectItem>
                         <SelectItem value="adaptive_mean">Adaptive Mean</SelectItem>
                       </SelectContent>
                     </Select>
                   </div>
                   <div className="flex items-center gap-1">
                     <Label htmlFor="baseline-sigma" title="Gaussian smoothing (range 0-10, step 0.1). Higher values smooth noise but can erase small pores; lower values preserve fine pores and edges.">Sigma</Label>
                     <Input
                       id="baseline-sigma"
                       className="w-[68px] h-8 text-xs"
                       type="number"
                       min={0}
                       max={10}
                       step={0.1}
                       title="Gaussian smoothing (range 0-10, step 0.1). Try 0.4-0.8 for small pores, 1.0-2.0 for noisy scans."
                       value={baselineSigma}
                       onChange={(e) => {
                         const next = Number(e.target.value);
                         if (!Number.isFinite(next)) {
                           return;
                         }
                         setBaselineSigma(next);
                         toolboxState.setBaselineSigma(next);
                       }}
                     />
                   </div>
                   <div className="flex items-center gap-1">
                     <Label htmlFor="baseline-clip" title="Upper intensity clip quantile (range 0.5-1.0, step 0.01). Lower values clip bright outliers more aggressively, improving dark-pore contrast; very low values may over-compress intensities.">Clip</Label>
                     <Input
                       id="baseline-clip"
                       className="w-[68px] h-8 text-xs"
                       type="number"
                       min={0.5}
                       max={1}
                       step={0.01}
                       title="Upper clip quantile (0.5-1.0). Typical 0.90-0.99; lower increases pore contrast, higher keeps original intensity spread."
                       value={baselineClipQuantile}
                       onChange={(e) => {
                         const next = Number(e.target.value);
                         if (!Number.isFinite(next)) {
                           return;
                         }
                         setBaselineClipQuantile(next);
                         toolboxState.setBaselineClipQuantile(next);
                       }}
                     />
                   </div>
                   {baselineThresholdMethod === 'otsu' && (
                     <div className="flex items-center gap-1">
                       <Label htmlFor="baseline-threshold-scale" title="Multiplier on the Otsu threshold (range 0.5-2.0, step 0.05). Higher values classify more voxels as pores (higher sensitivity); lower values are stricter and reduce false positives.">Scale</Label>
                       <Input
                         id="baseline-threshold-scale"
                         className="w-[68px] h-8 text-xs"
                         type="number"
                         min={0.5}
                         max={2}
                         step={0.05}
                         title="Threshold scale (0.5-2.0). Increase toward 1.1-1.4 to catch more pores; decrease toward 0.70-0.95 for stricter segmentation."
                         value={baselineThresholdScale}
                         onChange={(e) => {
                           const next = Number(e.target.value);
                           if (!Number.isFinite(next)) {
                             return;
                           }
                           setBaselineThresholdScale(next);
                           toolboxState.setBaselineThresholdScale(next);
                         }}
                       />
                     </div>
                   )}
                   {baselineThresholdMethod === 'percentile' && (
                     <div className="flex items-center gap-1">
                       <Label htmlFor="baseline-percentile" title="Lower percentile thresholds more aggressively segment dark pores; higher values are stricter.">Pct</Label>
                       <Input
                         id="baseline-percentile"
                         className="w-[68px] h-8 text-xs"
                         type="number"
                         min={0}
                         max={100}
                         step={1}
                         title="Intensity percentile used as the cutoff. Typical values: 5-35 for dark pores."
                         value={baselinePercentile}
                         onChange={(e) => {
                           const next = Number(e.target.value);
                           if (!Number.isFinite(next)) {
                             return;
                           }
                           setBaselinePercentile(next);
                           toolboxState.setBaselinePercentile(next);
                         }}
                       />
                     </div>
                   )}
                   {baselineThresholdMethod === 'adaptive_mean' && (
                     <>
                       <div className="flex items-center gap-1">
                         <Label htmlFor="baseline-local-block-size" title="Odd neighborhood size used for local adaptive thresholding.">Block</Label>
                         <Input
                           id="baseline-local-block-size"
                           className="w-[68px] h-8 text-xs"
                           type="number"
                           min={3}
                           step={2}
                           title="Local neighborhood size (odd integers only, e.g. 15, 21, 31). Larger values smooth more aggressively."
                           value={baselineLocalBlockSize}
                           onChange={(e) => {
                             const next = Number(e.target.value);
                             if (!Number.isFinite(next)) {
                               return;
                             }
                             setBaselineLocalBlockSize(next);
                             toolboxState.setBaselineLocalBlockSize(next);
                           }}
                         />
                       </div>
                       <div className="flex items-center gap-1">
                         <Label htmlFor="baseline-local-offset" title="Subtracts from the adaptive local threshold; higher values make the mask more inclusive.">Offset</Label>
                         <Input
                           id="baseline-local-offset"
                           className="w-[68px] h-8 text-xs"
                           type="number"
                           step={0.01}
                           title="Adaptive threshold offset. Increase to include more dark voxels; decrease to be stricter."
                           value={baselineLocalOffset}
                           onChange={(e) => {
                             const next = Number(e.target.value);
                             if (!Number.isFinite(next)) {
                               return;
                             }
                             setBaselineLocalOffset(next);
                             toolboxState.setBaselineLocalOffset(next);
                           }}
                         />
                       </div>
                     </>
                   )}
                 </div>
                )}
              {isTextPromptToolbox && (
                <div className="flex justify-center items-center gap-4 py-2 px-1">
                   <div className="flex items-center gap-2">
                     <Label htmlFor="replace-new">Replace/New</Label>
                     <Switch
                       id="replace-new"
                       checked={textPromptReplaceNew}
                       onCheckedChange={(checked) => {
                        setTextPromptReplaceNew(checked);
                        toolboxState.setTextPromptReplaceNew(checked);
                        console.log('Replace/New:', checked);
                      }}
                     />
                   </div>
                 </div>
                )}
              <div
                className="bg-muted flex flex-wrap space-x-2 py-2 px-1"
              >
              {buttons.map(tool => {
                if (!tool) {
                  return null;
                }
                const { id, Component, componentProps } = tool;

                // Hide testMedgemma button since we have input fields in the Toolbox
                if (isTestMedgemmaToolbox && id === 'testMedgemma') {
                  return null;
                }

                return (
                  <div
                    key={id}
                    className={classnames('ml-1')}
                  >
                    <Component
                      {...componentProps}
                      id={id}
                      onInteraction={handleInteraction}
                      size="toolbox"
                      servicesManager={servicesManager}
                    />
                  </div>
                );
              })}
            </div>
            {isTestMedgemmaToolbox && (
              <div className="flex flex-col gap-3 py-3 px-2 border-t border-primary/20">
                <div className="flex flex-col gap-2">
                  <Label htmlFor="medgemma-instruction" className="text-sm font-semibold">Instruction (Optional)</Label>
                  <textarea
                    id="medgemma-instruction"
                    value={medgemmaInstruction}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMedgemmaInstruction(value);
                      toolboxState.setMedgemmaInstruction(value);
                    }}
                    placeholder="Enter instruction (e.g., 'You are an instructor teaching medical students...')"
                    className="min-h-[60px] text-sm bg-primary-dark border border-primary-main rounded p-2 text-white placeholder:text-primary-light resize-y"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label htmlFor="medgemma-query" className="text-sm font-semibold">Query</Label>
                  <textarea
                    id="medgemma-query"
                    value={medgemmaQuery}
                    onChange={(e) => {
                      const value = e.target.value;
                      setMedgemmaQuery(value);
                      toolboxState.setMedgemmaQuery(value);
                    }}
                    placeholder="Enter your query/question"
                    className="min-h-[60px] text-sm bg-primary-dark border border-primary-main rounded p-2 text-white placeholder:text-primary-light resize-y"
                  />
                </div>
                <div className="flex flex-col gap-2">
                  <Label className="text-sm font-semibold">Slice Range (Optional)</Label>
                  <div className="flex gap-2">
                    <div className="flex flex-col gap-1 flex-1">
                      <Label htmlFor="medgemma-start-slice" className="text-xs text-primary-light">Start Slice (min: 1)</Label>
                      <input
                        id="medgemma-start-slice"
                        type="number"
                        min="1"
                        value={medgemmaStartSlice ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                          setMedgemmaStartSlice(value);
                          toolboxState.setMedgemmaStartSlice(value);
                        }}
                        placeholder="1"
                        className="text-sm bg-primary-dark border border-primary-main rounded p-2 text-white placeholder:text-primary-light"
                      />
                    </div>
                    <div className="flex flex-col gap-1 flex-1">
                      <Label htmlFor="medgemma-end-slice" className="text-xs text-primary-light">End Slice (max: total slices)</Label>
                      <input
                        id="medgemma-end-slice"
                        type="number"
                        min="1"
                        value={medgemmaEndSlice ?? ''}
                        onChange={(e) => {
                          const value = e.target.value === '' ? null : parseInt(e.target.value, 10);
                          setMedgemmaEndSlice(value);
                          toolboxState.setMedgemmaEndSlice(value);
                        }}
                        placeholder="Total slices"
                        className="text-sm bg-primary-dark border border-primary-main rounded p-2 text-white placeholder:text-primary-light"
                      />
                    </div>
                  </div>
                </div>
                <Button
                  variant="default"
                  size="sm"
                  onClick={() => {
                    commandsManager?.run('testMedgemma', { 
                      instruction: medgemmaInstruction, 
                      query: medgemmaQuery,
                      startSlice: medgemmaStartSlice,
                      endSlice: medgemmaEndSlice
                    });
                  }}
                  disabled={!medgemmaQuery || medgemmaQuery.trim() === ''}
                  className="w-full"
                >
                  Run Medgemma
                </Button>
                {medgemmaResult && (
                  <div className="flex flex-col gap-2 mt-2">
                    <Label className="text-sm font-semibold">Result:</Label>
                    <div className="bg-primary-dark border border-primary-main rounded p-3 max-h-[300px] overflow-y-auto">
                      <pre className="whitespace-pre-wrap break-words text-sm text-white">
                        {medgemmaResult}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            )}
            </React.Fragment>
          );
        })}
        {activeToolOptions && (
          <div className="bg-primary-dark mt-1 h-auto px-2">
            <ToolSettings options={activeToolOptions} />
          </div>
        )}
      </PanelSection.Content>
      )}
    </PanelSection>
  );
}
