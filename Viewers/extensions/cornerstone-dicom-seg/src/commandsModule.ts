import dcmjs from 'dcmjs';
import { classes, Types } from '@ohif/core';
import { cache, metaData, imageLoader } from '@cornerstonejs/core';
import { segmentation as cornerstoneToolsSegmentation } from '@cornerstonejs/tools';
import { adaptersRT, helpers, adaptersSEG } from '@cornerstonejs/adapters';
import { createReportDialogPrompt } from '@ohif/extension-default';
import { DicomMetadataStore } from '@ohif/core';

import PROMPT_RESPONSES from '../../default/src/utils/_shared/PROMPT_RESPONSES';

const { datasetToBlob } = dcmjs.data;

const getTargetViewport = ({ viewportId, viewportGridService }) => {
  const { viewports, activeViewportId } = viewportGridService.getState();
  const targetViewportId = viewportId || activeViewportId;

  const viewport = viewports.get(targetViewportId);

  return viewport;
};

const {
  Cornerstone3D: {
    Segmentation: { generateSegmentation },
  },
} = adaptersSEG;

const {
  Cornerstone3D: {
    RTSS: { generateRTSSFromSegmentations },
  },
} = adaptersRT;

const { downloadDICOMData } = helpers;

/**
 * Creates a minimal grayscale TIFF file buffer.
 * Fiji/ImageJ can read these basic TIFF files without issues.
 */
function createGrayscaleTIFF(pixelData: Uint8Array, height: number, width: number): ArrayBuffer {
  const numEntries = 10;
  const ifdOffset = 8;
  const dataOffset = ifdOffset + 2 + 12 * numEntries + 4; // entryCount + entries + nextIFDOffset
  const buffer = new ArrayBuffer(dataOffset + pixelData.length);
  const view = new DataView(buffer);
  const uint8 = new Uint8Array(buffer);

  let offset = 0;

  // TIFF Header (little-endian)
  view.setUint16(offset, 0x4949, true); // 'II' = little-endian
  offset += 2;
  view.setUint16(offset, 42, true); // TIFF magic number
  offset += 2;
  view.setUint32(offset, 8, true); // Offset to first IFD
  offset += 4;

  // Image File Directory (IFD)
  view.setUint16(ifdOffset, numEntries, true); // Number of directory entries

  let ifdPos = ifdOffset + 2;

  // Helper to add IFD entry
  const addIFDEntry = (tag: number, type: number, count: number, value: number) => {
    view.setUint16(ifdPos, tag, true);
    view.setUint16(ifdPos + 2, type, true);
    view.setUint32(ifdPos + 4, count, true);
    view.setUint32(ifdPos + 8, value, true);
    ifdPos += 12;
  };

  // IFD Entries (in ascending tag order)
  addIFDEntry(254, 4, 1, 0); // NewSubfileType = full-resolution image
  addIFDEntry(256, 4, 1, width); // ImageWidth
  addIFDEntry(257, 4, 1, height); // ImageLength (height)
  addIFDEntry(258, 3, 1, 8); // BitsPerSample = 8
  addIFDEntry(259, 3, 1, 1); // Compression = None
  addIFDEntry(262, 3, 1, 1); // PhotometricInterpretation = BlackIsZero
  addIFDEntry(273, 4, 1, dataOffset); // StripOffsets
  addIFDEntry(277, 3, 1, 1); // SamplesPerPixel = 1 (grayscale)
  addIFDEntry(278, 4, 1, height); // RowsPerStrip = all rows
  addIFDEntry(279, 4, 1, pixelData.length); // StripByteCounts

  // Next IFD offset (none)
  view.setUint32(ifdPos, 0, true);

  // Append pixel data
  uint8.set(pixelData, dataOffset);

  return buffer;
}

/**
 * Create multi-page TIFF from array of pixel data
 * Each slice becomes a separate image in the TIFF file
 */
function createMultiPageTIFF(
  slices: Array<{ pixelData: Uint8Array; rows: number; columns: number }>
): ArrayBuffer {
  if (slices.length === 0) throw new Error('No slices to export');

  const parts: Uint8Array[] = [];

  // TIFF Header
  const header = new ArrayBuffer(8);
  const headerView = new DataView(header);
  headerView.setUint16(0, 0x4949, true); // 'II' = little-endian
  headerView.setUint16(2, 42, true); // TIFF magic
  headerView.setUint32(4, 8, true); // Offset to first IFD
  parts.push(new Uint8Array(header));

  let currentOffset = 8;

  // Create IFD for each slice
  for (let i = 0; i < slices.length; i++) {
    const slice = slices[i];
    const numEntries = 10;
    const ifdSize = 2 + 12 * numEntries + 4;
    const dataOffset = currentOffset + ifdSize;

    const ifd = new ArrayBuffer(ifdSize);
    const ifdView = new DataView(ifd);
    const ifdUint8 = new Uint8Array(ifd);

    ifdView.setUint16(0, numEntries, true);
    let ifdPos = 2;

    const addEntry = (tag: number, type: number, count: number, value: number) => {
      ifdView.setUint16(ifdPos, tag, true);
      ifdView.setUint16(ifdPos + 2, type, true);
      ifdView.setUint32(ifdPos + 4, count, true);
      ifdView.setUint32(ifdPos + 8, value, true);
      ifdPos += 12;
    };

    addEntry(254, 4, 1, i === 0 ? 0 : 1); // NewSubfileType (0=full res, 1=reduced)
    addEntry(256, 4, 1, slice.columns); // ImageWidth
    addEntry(257, 4, 1, slice.rows); // ImageLength
    addEntry(258, 3, 1, 8); // BitsPerSample
    addEntry(259, 3, 1, 1); // Compression (1=none)
    addEntry(262, 3, 1, 1); // PhotometricInterpretation (1=BlackIsZero)
    addEntry(273, 4, 1, dataOffset); // StripOffsets
    addEntry(277, 3, 1, 1); // SamplesPerPixel
    addEntry(278, 4, 1, slice.rows); // RowsPerStrip
    addEntry(279, 4, 1, slice.pixelData.length); // StripByteCounts

    // Next IFD offset
    const nextIFDOffset =
      i < slices.length - 1 ? dataOffset + slice.pixelData.length : 0;
    ifdView.setUint32(ifdPos, nextIFDOffset, true);

    parts.push(ifdUint8);
    parts.push(slice.pixelData);

    currentOffset = nextIFDOffset;
  }

  // Merge all parts
  let totalSize = 0;
  for (const part of parts) totalSize += part.length;
  const result = new Uint8Array(totalSize);
  let pos = 0;
  for (const part of parts) {
    result.set(part, pos);
    pos += part.length;
  }

  return result.buffer;
}

const commandsModule = ({
  servicesManager,
  extensionManager,
}: Types.Extensions.ExtensionParams): Types.Extensions.CommandsModule => {
  const { segmentationService, displaySetService, viewportGridService, toolGroupService } =
    servicesManager.services as AppTypes.Services;

  const actions = {
    /**
     * Loads segmentations for a specified viewport.
     * The function prepares the viewport for rendering, then loads the segmentation details.
     * Additionally, if the segmentation has scalar data, it is set for the corresponding label map volume.
     *
     * @param {Object} params - Parameters for the function.
     * @param params.segmentations - Array of segmentations to be loaded.
     * @param params.viewportId - the target viewport ID.
     *
     */
    loadSegmentationsForViewport: async ({ segmentations, viewportId }) => {
      // Todo: handle adding more than one segmentation
      const viewport = getTargetViewport({ viewportId, viewportGridService });
      const displaySetInstanceUID = viewport.displaySetInstanceUIDs[0];

      const segmentation = segmentations[0];
      const segmentationId = segmentation.segmentationId;
      const label = segmentation.config.label;
      const segments = segmentation.config.segments;

      const displaySet = displaySetService.getDisplaySetByUID(displaySetInstanceUID);

      await segmentationService.createLabelmapForDisplaySet(displaySet, {
        segmentationId,
        segments,
        label,
      });

      segmentationService.addOrUpdateSegmentation(segmentation);

      await segmentationService.addSegmentationRepresentation(viewport.viewportId, {
        segmentationId,
      });

      return segmentationId;
    },
    /**
     * Generates a segmentation from a given segmentation ID.
     * This function retrieves the associated segmentation and
     * its referenced volume, extracts label maps from the
     * segmentation volume, and produces segmentation data
     * alongside associated metadata.
     *
     * @param {Object} params - Parameters for the function.
     * @param params.segmentationId - ID of the segmentation to be generated.
     * @param params.options - Optional configuration for the generation process.
     *
     * @returns Returns the generated segmentation data.
     */
    generateSegmentation: async ({ segmentationId, options = {} }) => {
      const segmentation = cornerstoneToolsSegmentation.state.getSegmentation(segmentationId);

      const { imageIds } = segmentation.representationData.Labelmap;

      const segImages = imageIds.map(imageId => cache.getImage(imageId));
      
      // Collect all referenced image IDs (maintaining array structure to match segImages)
      const referencedImageIds = segImages.map(image => image?.referencedImageId);
      
      // Load all referenced images that exist but may not be in cache yet
      // This is necessary because lazy loading may not have loaded all slices yet
      await Promise.all(
        referencedImageIds.map(referencedImageId => {
          if (!referencedImageId) {
            return Promise.resolve(null);
          }
          // Check if already in cache
          const cachedImage = cache.getImage(referencedImageId);
          if (cachedImage) {
            return Promise.resolve(cachedImage);
          }
          // Load if not in cache
          return imageLoader.loadAndCacheImage(referencedImageId).catch(error => {
            console.warn(`Failed to load referenced image ${referencedImageId}:`, error);
            return null;
          });
        })
      );
      
      // Now get all referenced images from cache, maintaining the same order as segImages
      const referencedImages = segImages.map(image => {
        if (!image?.referencedImageId) {
          return null;
        }
        return cache.getImage(image.referencedImageId);
      });

      const labelmaps2D = [];

      let z = 0;

      for (const segImage of segImages) {
        const segmentsOnLabelmap = new Set();
        const pixelData = segImage.getPixelData();
        const { rows, columns } = segImage;

        // Use a single pass through the pixel data
        for (let i = 0; i < pixelData.length; i++) {
          const segment = pixelData[i];
          if (segment !== 0) {
            segmentsOnLabelmap.add(segment);
          }
        }

        labelmaps2D[z++] = {
          segmentsOnLabelmap: Array.from(segmentsOnLabelmap),
          pixelData,
          rows,
          columns,
        };
      }

      const allSegmentsOnLabelmap = labelmaps2D.map(labelmap => labelmap.segmentsOnLabelmap);

      const labelmap3D = {
        segmentsOnLabelmap: Array.from(new Set(allSegmentsOnLabelmap.flat())),
        metadata: [],
        labelmaps2D,
      };

      const segmentationInOHIF = segmentationService.getSegmentation(segmentationId);
      const representations = segmentationService.getRepresentationsForSegmentation(segmentationId);

      Object.entries(segmentationInOHIF.segments).forEach(([segmentIndex, segment]) => {
        // segmentation service already has a color for each segment
        if (!segment) {
          return;
        }

        const { label } = segment;

        const firstRepresentation = representations[0];
        const color = segmentationService.getSegmentColor(
          firstRepresentation.viewportId,
          segmentationId,
          segment.segmentIndex
        );

        const RecommendedDisplayCIELabValue = dcmjs.data.Colors.rgb2DICOMLAB(
          color.slice(0, 3).map(value => value / 255)
        ).map(value => Math.round(value));

        let segmentMetadata = {};
        if (segmentation.cachedStats.data !== undefined && segmentation.cachedStats.data.length > 1) {
          segmentMetadata = segmentation.cachedStats.data
          .filter(e => e !== undefined && e !== null)
          .find(e => e.SegmentNumber == segmentIndex);
          if (segmentMetadata !== undefined && Object.keys(segmentMetadata).length !== 0){ 
            segmentMetadata.SegmentNumber = segmentIndex.toString();
            segmentMetadata.SegmentLabel = label;
            segmentMetadata.RecommendedDisplayCIELabValue = RecommendedDisplayCIELabValue;
            segmentMetadata.SegmentAlgorithmType = segmentation.cachedStats.seriesInstanceUid;
          }
        }

        if (segmentMetadata === undefined || Object.keys(segmentMetadata).length === 0) {
          segmentMetadata = {
            SegmentNumber: segmentIndex.toString(),
            SegmentLabel: label,
            SegmentAlgorithmType: segment?.algorithmType || 'MANUAL',
            SegmentAlgorithmName: segment?.algorithmName || 'OHIF Brush',
            RecommendedDisplayCIELabValue,
            SegmentedPropertyCategoryCodeSequence: {
              CodeValue: 'T-D0050',
              CodingSchemeDesignator: 'SRT',
              CodeMeaning: 'Tissue',
            },
            SegmentedPropertyTypeCodeSequence: {
              CodeValue: 'T-D0050',
              CodingSchemeDesignator: 'SRT',
              CodeMeaning: 'Tissue',
            },
          };
        }
        if (segment.cachedStats.description !== undefined){
          segmentMetadata.SegmentDescription = segment.cachedStats.description;
        }
        if (segment.cachedStats.algorithmName !== undefined){
          segmentMetadata.SegmentAlgorithmName = segment.cachedStats.algorithmName;
        }
        if (segment.cachedStats.algorithmType !== undefined){
          segmentMetadata.SegmentAlgorithmType = segment.cachedStats.algorithmType;
        }
        if (segmentation.cachedStats.seriesInstanceUid !== undefined){
          segmentMetadata.SegmentAlgorithmType = segmentation.cachedStats.seriesInstanceUid;
        }
        
        labelmap3D.metadata[segmentIndex] = segmentMetadata;
      });

      const generatedSegmentation = generateSegmentation(
        referencedImages,
        labelmap3D,
        metaData,
        options
      );

      return generatedSegmentation;
    },
    /**
     * Downloads a segmentation based on the provided segmentation ID.
     * This function retrieves the associated segmentation and
     * uses it to generate the corresponding DICOM dataset, which
     * is then downloaded with an appropriate filename.
     *
     * @param {Object} params - Parameters for the function.
     * @param params.segmentationId - ID of the segmentation to be downloaded.
     *
     */
    downloadSegmentation: async ({ segmentationId }) => {
      const segmentationInOHIF = segmentationService.getSegmentation(segmentationId);
      const generatedSegmentation = await actions.generateSegmentation({
        segmentationId,
      });

      downloadDICOMData(generatedSegmentation.dataset, `${segmentationInOHIF.label}`);
    },
    /**
     * Exports all segmentation slices as a multi-page TIFF file.
     *
     * @param {Object} params - Parameters for the function.
     * @param params.segmentationId - ID of the segmentation to be downloaded.
     */
    downloadSegmentationAsAllSlicesTiff: async ({ segmentationId }) => {
      const segmentation = cornerstoneToolsSegmentation.state.getSegmentation(segmentationId);
      const segmentationInOHIF = segmentationService.getSegmentation(segmentationId);

      if (!segmentation || !segmentation.representationData.Labelmap) {
        throw new Error('No segmentation labelmap found');
      }

      const { imageIds } = segmentation.representationData.Labelmap;
      const segImages = imageIds.map(imageId => cache.getImage(imageId));
      const slices: Array<{ pixelData: Uint8Array; rows: number; columns: number }> = [];

      // Process all slices (including empty ones)
      for (let sliceIndex = 0; sliceIndex < segImages.length; sliceIndex++) {
        const segImage = segImages[sliceIndex];
        if (!segImage) {
          continue;
        }

        const pixelData = segImage.getPixelData();
        const { rows, columns } = segImage;

        const uint8PixelData = new Uint8Array(pixelData.length);
        for (let i = 0; i < pixelData.length; i++) {
          uint8PixelData[i] = pixelData[i] > 0 ? 255 : 0;
        }

        slices.push({ pixelData: uint8PixelData, rows, columns });
      }

      if (slices.length === 0) {
        throw new Error('No segmentation slices found to export');
      }

      const tiffBuffer = createMultiPageTIFF(slices);
      const tiffBlob = new Blob([tiffBuffer], { type: 'image/tiff' });
      const url = URL.createObjectURL(tiffBlob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${segmentationInOHIF.label}_all_slices.tif`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    },
    /**
     * Stores a segmentation based on the provided segmentationId into a specified data source.
     * The SeriesDescription is derived from user input or defaults to the segmentation label,
     * and in its absence, defaults to 'Research Derived Series'.
     *
     * @param {Object} params - Parameters for the function.
     * @param params.segmentationId - ID of the segmentation to be stored.
     * @param params.dataSource - Data source where the generated segmentation will be stored.
     *
     * @returns {Object|void} Returns the naturalized report if successfully stored,
     * otherwise throws an error.
     */
    storeSegmentation: async ({ segmentationId, dataSource }) => {
      const segmentation = segmentationService.getSegmentation(segmentationId);

      if (!segmentation) {
        throw new Error('No segmentation found');
      }

      const { label } = segmentation;
      const defaultDataSource = dataSource ?? extensionManager.getActiveDataSource();

      const {
        value: reportName,
        dataSourceName: selectedDataSource,
        action,
      } = await createReportDialogPrompt({
        servicesManager,
        extensionManager,
        title: 'Store Segmentation',
      });

      if (action === PROMPT_RESPONSES.CREATE_REPORT) {
        try {
          const selectedDataSourceConfig = selectedDataSource
            ? extensionManager.getDataSources(selectedDataSource)[0]
            : defaultDataSource;

          const generatedData = await actions.generateSegmentation({
            segmentationId,
            options: {
              SeriesDescription: reportName || label || 'Research Derived Series',
            },
          });

          if (!generatedData || !generatedData.dataset) {
            throw new Error('Error during segmentation generation');
          }

          const { dataset: naturalizedReport } = generatedData;
          let selectedDataSourceConfig_new = undefined;
          if (selectedDataSourceConfig.store == undefined) {
            selectedDataSourceConfig_new = selectedDataSourceConfig[0];
          } else {
            selectedDataSourceConfig_new = selectedDataSourceConfig;
          }
          
          await selectedDataSourceConfig_new.store.dicom(naturalizedReport);
          
          // add the information for where we stored it to the instance as well
          naturalizedReport.wadoRoot = selectedDataSourceConfig_new.getConfig().wadoRoot;

          DicomMetadataStore.addInstances([naturalizedReport], true);

          return naturalizedReport;
        } catch (error) {
          console.debug('Error storing segmentation:', error);
          throw error;
        }
      }
    },
    /**
     * Converts segmentations into RTSS for download.
     * This sample function retrieves all segentations and passes to
     * cornerstone tool adapter to convert to DICOM RTSS format. It then
     * converts dataset to downloadable blob.
     *
     */
    downloadRTSS: async ({ segmentationId }) => {
      const segmentations = segmentationService.getSegmentation(segmentationId);

      // inject colors to the segmentIndex
      const firstRepresentation =
        segmentationService.getRepresentationsForSegmentation(segmentationId)[0];
      Object.entries(segmentations.segments).forEach(([segmentIndex, segment]) => {
        segment.color = segmentationService.getSegmentColor(
          firstRepresentation.viewportId,
          segmentationId,
          segmentIndex
        );
      });

      const RTSS = await generateRTSSFromSegmentations(
        segmentations,
        classes.MetadataProvider,
        DicomMetadataStore
      );

      try {
        const reportBlob = datasetToBlob(RTSS);

        //Create a URL for the binary.
        const objectUrl = URL.createObjectURL(reportBlob);
        window.location.assign(objectUrl);
      } catch (e) {
        console.warn(e);
      }
    },
  };

  const definitions = {
    loadSegmentationsForViewport: {
      commandFn: actions.loadSegmentationsForViewport,
    },

    generateSegmentation: {
      commandFn: actions.generateSegmentation,
    },
    downloadSegmentation: {
      commandFn: actions.downloadSegmentation,
    },
    downloadSegmentationAsAllSlicesTiff: {
      commandFn: actions.downloadSegmentationAsAllSlicesTiff,
    },
    storeSegmentation: {
      commandFn: actions.storeSegmentation,
    },
    downloadRTSS: {
      commandFn: actions.downloadRTSS,
    },
  };

  return {
    actions,
    definitions,
    defaultContext: 'SEGMENTATION',
  };
};

export default commandsModule;
