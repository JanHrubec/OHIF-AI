# Toolbar Button Rendering and Command Execution Flow

## Overview
This document traces the complete flow from button click to command execution in the OHIF-AI viewer.

---

## 1. Button Click → onInteraction Callback

### File: [Viewers/platform/ui-next/src/components/ToolButton/ToolButton.tsx](Viewers/platform/ui-next/src/components/ToolButton/ToolButton.tsx#L85)

**Lines 85-89:** ToolButton component fires onInteraction when clicked
```tsx
onClick={() => {
  if (!disabled) {
    onInteraction?.({ itemId: id, commands });
  }
}}
```

The `onInteraction` callback is passed as a prop to ToolButton and receives:
- `itemId`: unique identifier of the button
- `commands`: command definitions from button props

---

## 2. Component Hierarchy Rendering Buttons

### Entry Point: [Viewers/extensions/default/src/Toolbar/Toolbar.tsx](Viewers/extensions/default/src/Toolbar/Toolbar.tsx)

**Lines 1-33:** Main Toolbar component
- Uses the `useToolbar` hook to get `onInteraction` callback
- Maps over `toolbarButtons` array
- Passes `onInteraction` to each toolbar button Component as a prop

```tsx
const { toolbarButtons, onInteraction } = useToolbar({
  servicesManager,
  buttonSection,
});

{toolbarButtons?.map(toolDef => {
  const { id, Component, componentProps } = toolDef;
  const tool = (
    <Component
      key={id}
      id={id}
      onInteraction={onInteraction}
      servicesManager={servicesManager}
      {...componentProps}
    />
  );
  return <div key={id}>{tool}</div>;
})}
```

### Alternative Renderers

**[Viewers/extensions/default/src/Toolbar/ToolBoxWrapper.tsx](Viewers/extensions/default/src/Toolbar/ToolBoxWrapper.tsx#L11-57)**
- `ToolBoxButtonGroupWrapper`: Renders button groups with `onInteraction` passed to each ToolButton
- `ToolBoxButtonWrapper`: Renders single buttons, wrapping onInteraction event with additional metadata

**[Viewers/extensions/default/src/Toolbar/ToolButtonListWrapper.tsx](Viewers/extensions/default/src/Toolbar/ToolButtonListWrapper.tsx#L56-57)**
- Renders split buttons in a dropdown list
- Calls `onInteraction` with `groupId`, `itemId`, and `commands`

---

## 3. onInteraction Callback Definition & Command Execution

### File: [Viewers/platform/core/src/hooks/useToolbar.tsx](Viewers/platform/core/src/hooks/useToolbar.tsx#L14-60)

**Lines 14-60:** `useToolbar` hook defines the onInteraction callback

```tsx
const onInteraction = useCallback(
  args => {
    args.event?.stopPropagation?.();
    const viewportId = viewportGridService.getActiveViewportId();
    const refreshProps = { viewportId };

    const buttonProps = toolbarService.getButtonProps(args.itemId);

    if (buttonProps.commands || buttonProps.options) {
      const allCommands = [];
      const options = buttonProps.options || [];
      const itemCommands = buttonProps.commands || [];

      // Process item commands
      if (itemCommands) {
        Array.isArray(itemCommands)
          ? allCommands.push(...itemCommands)
          : allCommands.push(itemCommands);
      }

      // Process commands from options
      if (options.length > 0) {
        options.forEach(option => {
          if (!option.commands) {
            return;
          }

          const valueToUse = option.value;
          const commands = Array.isArray(option.commands) ? option.commands : [option.commands];

          commands.forEach(command => {
            const commandOptions = {
              ...option,
              value: valueToUse,
              options: buttonProps.options,
              servicesManager: servicesManager,
              commandsManager: commandsManager,
            };

            const processedCommand = () => commandsManager.run(command, commandOptions);
            allCommands.push(processedCommand);
          });
        });
      }

      buttonProps.commands = allCommands;
    }
    toolbarService.recordInteraction({ ...args, ...buttonProps }, { refreshProps });
  },
  [toolbarService, viewportGridService, toolbarButtons]
);
```

### Key Processing Steps:

1. **Stop propagation:** Prevents event bubbling
2. **Get button metadata:** Retrieves button props from toolbarService via `args.itemId`
3. **Collect commands:** Gathers commands from both direct button `commands` and `options`
4. **Build command options:** Enriches each command with context (viewport, services, managers)
5. **Execute via commandsManager:** Wraps each command in a closure: `() => commandsManager.run(command, commandOptions)`
6. **Record interaction:** Logs the interaction via `toolbarService.recordInteraction()`

### Critical: Where commandsManager.run() is Called

**Line 45 in useToolbar.tsx:**
```tsx
const processedCommand = () => commandsManager.run(command, commandOptions);
```

The `commandsManager.run()` call is **wrapped in a closure** and pushed to `allCommands` array. This means:
- Commands are not executed immediately when the button is clicked
- They are prepared and stored for later execution by the toolbarService
- The toolbarService.recordInteraction() call at line 59 triggers the actual execution

---

## 4. UI Registration of Toolbar Components

### File: [Viewers/extensions/default/src/getToolbarModule.tsx](Viewers/extensions/default/src/getToolbarModule.tsx#L29-34)

**Lines 29-34:** Registers toolbar button component types
```tsx
{
  name: 'ohif.toolBoxButtonGroup',
  defaultComponent: ToolBoxButtonGroupWrapper,
},
{
  name: 'ohif.toolBoxButton',
  defaultComponent: ToolBoxButtonWrapper,
}
```

These components are referenced by toolbar button definitions in modes (e.g., `segmentation/toolbarButtons.ts`).

---

## 5. Toolbar Usage in Different Contexts

### Toolbox Component: [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx#L593)

**Line 593:** Custom `handleInteraction` handler for AI/Porosity toolboxes
```tsx
const handleInteraction = ({ itemId }: { itemId: string }) => {
  if ((isAIToolBox || isPorosityToolbox) && isLocked && itemId !== 'Pan') {
    // Prevent tool changes when locked; keep Pan active
    commandsManager?.run?.('setToolActive', { toolName: 'Pan' });
    return;
  }
  onInteraction?.({ itemId });
};
```

This intercepts interactions to prevent tool changes when the toolbox is locked.

---

## Complete Flow Diagram

```
User clicks ToolButton
    ↓
ToolButton.onClick() triggered [ToolButton.tsx:85-89]
    ↓
onInteraction({ itemId, commands }) called
    ↓
useToolbar.onInteraction callback [useToolbar.tsx:14-60]
    ↓
1. Get active viewportId
2. Fetch button props via toolbarService.getButtonProps(itemId)
3. Collect commands from button.commands and button.options
    ↓
4. For each command: wrap in closure with commandOptions
    ↓
5. Call commandsManager.run(command, commandOptions) via closure
    ↓
6. Call toolbarService.recordInteraction()
    ↓
Command executed with full context (viewportId, services, managers)
```

---

## Summary of Key Files

| File | Purpose | Key Lines |
|------|---------|-----------|
| [Viewers/platform/ui-next/src/components/ToolButton/ToolButton.tsx](Viewers/platform/ui-next/src/components/ToolButton/ToolButton.tsx#L85) | UI component that fires onInteraction on click | 85-89 |
| [Viewers/extensions/default/src/Toolbar/Toolbar.tsx](Viewers/extensions/default/src/Toolbar/Toolbar.tsx) | Main toolbar renderer that passes onInteraction to components | 5-33 |
| [Viewers/platform/core/src/hooks/useToolbar.tsx](Viewers/platform/core/src/hooks/useToolbar.tsx#L14-60) | **Central command execution logic** | 14-60 |
| [Viewers/extensions/default/src/Toolbar/ToolBoxWrapper.tsx](Viewers/extensions/default/src/Toolbar/ToolBoxWrapper.tsx#L30-57) | Wraps individual buttons with metadata | 30-57 |
| [Viewers/extensions/default/src/Toolbar/ToolButtonListWrapper.tsx](Viewers/extensions/default/src/Toolbar/ToolButtonListWrapper.tsx#L56-75) | Wraps button lists/dropdowns | 56-75 |
| [Viewers/platform/ui/src/components/Toolbox/ToolboxUI.tsx](Viewers/platform/ui/src/components/Toolbox/ToolboxUI.tsx#L68-76) | Legacy toolbox UI component | 68-76 |
| [Viewers/extensions/default/src/utils/Toolbox.tsx](Viewers/extensions/default/src/utils/Toolbox.tsx#L257-309) | AI/Porosity toolbox with custom interaction handling | 257-309 |

---

## Key Insights

1. **Single entry point for command execution:** The `useToolbar` hook's `onInteraction` callback is where ALL toolbar button commands are processed and executed via `commandsManager.run()`.

2. **Command wrapping pattern:** Commands are wrapped in closures to preserve context and delay execution until the toolbarService processes them.

3. **Viewport-aware:** Every command execution includes the active `viewportId`, ensuring commands operate on the correct viewport.

4. **Extensible metadata:** The `commandOptions` parameter passed to `commandsManager.run()` includes services and managers, allowing commands to access any service during execution.

5. **Multiple UI paths:** While there are multiple components that render buttons (Toolbar, ToolBoxWrapper, ToolButtonListWrapper, Toolbox), they all converge on the same `onInteraction` callback from `useToolbar`.
