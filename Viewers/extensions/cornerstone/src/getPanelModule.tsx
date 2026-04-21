import React, { useEffect, useState } from 'react';

import { Toolbox } from '@ohif/extension-default';
import PanelSegmentation from './panels/PanelSegmentation';
import ActiveViewportWindowLevel from './components/ActiveViewportWindowLevel';
import PanelMeasurement from './panels/PanelMeasurement';

type BackendCapabilities = {
  voxtell: boolean;
  medgemma: boolean;
};

const DEFAULT_BACKEND_CAPABILITIES: BackendCapabilities = {
  voxtell: false,
  medgemma: false,
};

const OPTIONAL_TOOLBOXES: Array<{
  capability: keyof BackendCapabilities;
  buttonSectionId: string;
  title: string;
}> = [
  {
    capability: 'voxtell',
    buttonSectionId: 'textPromptSegmentationToolbox',
    title: 'Text Prompt Segmentation',
  },
  {
    capability: 'medgemma',
    buttonSectionId: 'testMedgemmaToolbox',
    title: 'Medgemma Testing',
  },
];

const getPanelModule = ({ commandsManager, servicesManager, extensionManager }: withAppTypes) => {
  const routerBasename =
    (((window as any)?.config?.routerBasename as string | null) || '').replace(/\/+$/, '');
  const withAppBase = (path: string) => `${routerBasename}${path.startsWith('/') ? path : `/${path}`}`;

  const OptionalAiToolboxes = () => {
    const [capabilities, setCapabilities] = useState<BackendCapabilities>(DEFAULT_BACKEND_CAPABILITIES);

    useEffect(() => {
      let isMounted = true;

      const loadCapabilities = async () => {
        try {
          const response = await fetch(withAppBase('/monai/info/'));
          if (!response.ok) {
            return;
          }

          const info = await response.json();
          const backendCapabilities = info?.capabilities ?? {};

          if (isMounted) {
            setCapabilities({
              voxtell: Boolean(backendCapabilities.voxtell),
              medgemma: Boolean(backendCapabilities.medgemma),
            });
          }
        } catch (error) {
          // keep defaults when backend info unavailable
        }
      };

      loadCapabilities();
      return () => {
        isMounted = false;
      };
    }, []);

    return (
      <>
        {OPTIONAL_TOOLBOXES.filter(toolbox => capabilities[toolbox.capability]).map(toolbox => (
          <React.Fragment key={toolbox.buttonSectionId}>
            <Toolbox
              buttonSectionId={toolbox.buttonSectionId}
              title={toolbox.title}
              defaultOpen={false}
            />
          </React.Fragment>
        ))}
      </>
    );
  };

  const wrappedPanelSegmentation = ({ configuration }) => {
    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
        configuration={{
          ...configuration,
        }}
      />
    );
  };

  const wrappedPanelSegmentationNoHeader = ({ configuration }) => {
    return (
      <PanelSegmentation
        commandsManager={commandsManager}
        servicesManager={servicesManager}
        extensionManager={extensionManager}
        configuration={{
          ...configuration,
        }}
      />
    );
  };

  const wrappedPanelSegmentationWithTools = ({ configuration }) => {
    return (
      <>
        <Toolbox
          buttonSectionId="aiToolBox"
          title="Interactive Prompt Tools"
          defaultOpen={true}
        />
        <Toolbox
          buttonSectionId="porosityToolbox"
          title="Porosity AI Actions"
          defaultOpen={true}
        />
        <OptionalAiToolboxes />
        <Toolbox
          buttonSectionId="segmentationToolbox"
          title="Non-Interactive Segmentation (Legacy)"
          defaultOpen={false}
        />
        <PanelSegmentation
          commandsManager={commandsManager}
          servicesManager={servicesManager}
          extensionManager={extensionManager}
          configuration={{
            ...configuration,
          }}
        />
      </>
    );
  };

  return [
    {
      name: 'activeViewportWindowLevel',
      component: () => {
        return <ActiveViewportWindowLevel servicesManager={servicesManager} />;
      },
    },
    {
      name: 'panelMeasurement',
      iconName: 'tab-linear',
      iconLabel: 'Measure',
      label: 'Measurement',
      component: PanelMeasurement,
    },
    {
      name: 'panelSegmentation',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: 'Segmentation',
      component: wrappedPanelSegmentation,
    },
    {
      name: 'panelSegmentationNoHeader',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: 'Segmentation',
      component: wrappedPanelSegmentationNoHeader,
    },
    {
      name: 'panelSegmentationWithTools',
      iconName: 'tab-segmentation',
      iconLabel: 'Segmentation',
      label: 'Segmentation',
      component: wrappedPanelSegmentationWithTools,
    },
  ];
};

export default getPanelModule;
