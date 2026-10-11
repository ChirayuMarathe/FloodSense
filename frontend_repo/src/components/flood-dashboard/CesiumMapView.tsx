'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import * as Cesium from 'cesium';
import {
  Viewer,
  Ion,
  createOsmBuildingsAsync,
  UrlTemplateImageryProvider,
  Cartesian3,
  Math as CesiumMath,
  Color,
  SunLight,
  CustomShader,
  UniformType,
  VaryingType,
  LightingModel,
  Cesium3DTileset,
  Terrain,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  ColorMaterialProperty,
  GeoJsonDataSource,
  ArcType,
  HeightReference,
  ConstantProperty,
} from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { WardLayer } from '@/lib/gis/WardLayer';
import { CITY_CENTERS } from '@/lib/gis/WardData';
import { flyToCity, flyToWard, initCameraControls, CITY_CAMERA_VIEWS } from '@/lib/gis/cameraController';
import { Box, RefreshCw } from 'lucide-react';

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

import WardTagLayer from './WardTagLayer';
import FloodDepthLegend from './FloodDepthLegend';
import { loadPhotorealTileset, loadOsmBuildingsTileset } from '@/lib/gis/BuildingTileset';

function getBuildingColor(heightM: number, buildingType: string): Color {
  const type = (buildingType || 'yes').toLowerCase();
  
  let hex = '#334155'; // default slate
  if (type === 'apartments' || type === 'residential') {
    hex = heightM > 25 ? '#3B4252' : '#475569';
  } else if (type === 'commercial' || type === 'office') {
    hex = heightM > 30 ? '#1E293B' : '#334155';
  } else if (type === 'hotel') {
    hex = '#374151';
  } else if (type === 'university' || type === 'college' || type === 'school') {
    hex = '#4B5563';
  }

  let color = Color.fromCssColorString(hex).withAlpha(0.96);
  if (heightM > 25) {
    const glassTint = Color.fromCssColorString('#60A5FA');
    const t = Math.min(0.35, (heightM - 25) / 50);
    color = Color.lerp(color, glassTint, t, new Color()).withAlpha(0.96);
  }
  return color;
}

function getFloodColorVec3(depth: number): Cartesian3 {
  if (depth <= 0.1) return new Cartesian3(0.133, 0.827, 0.933);
  
  const CYAN    = [0.133, 0.827, 0.933]; // #22D3EE
  const BLUE    = [0.086, 0.522, 1.000]; // #1685FF
  const DEEP    = [0.263, 0.220, 1.000]; // #4338FF
  const VIOLET  = [0.545, 0.361, 0.965]; // #8B5CF6
  const MAGENTA = [0.851, 0.275, 0.937]; // #D946EF

  let r = CYAN[0], g = CYAN[1], b = CYAN[2];
  if (depth <= 0.5) {
    [r, g, b] = CYAN;
  } else if (depth <= 1.0) {
    const t = (depth - 0.5) / 0.5;
    r = CYAN[0] + (BLUE[0] - CYAN[0]) * t;
    g = CYAN[1] + (BLUE[1] - CYAN[1]) * t;
    b = CYAN[2] + (BLUE[2] - CYAN[2]) * t;
  } else if (depth <= 2.0) {
    const t = (depth - 1.0) / 1.0;
    r = BLUE[0] + (DEEP[0] - BLUE[0]) * t;
    g = BLUE[1] + (DEEP[1] - BLUE[1]) * t;
    b = BLUE[2] + (DEEP[2] - BLUE[2]) * t;
  } else if (depth <= 3.0) {
    const t = (depth - 2.0) / 1.0;
    r = DEEP[0] + (VIOLET[0] - DEEP[0]) * t;
    g = DEEP[1] + (VIOLET[1] - DEEP[1]) * t;
    b = DEEP[2] + (VIOLET[2] - DEEP[2]) * t;
  } else {
    const t = Math.min(1.0, (depth - 3.0) / 0.5);
    r = VIOLET[0] + (MAGENTA[0] - VIOLET[0]) * t;
    g = VIOLET[1] + (MAGENTA[1] - VIOLET[1]) * t;
    b = VIOLET[2] + (MAGENTA[2] - VIOLET[2]) * t;
  }
  return new Cartesian3(r, g, b);
}

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const [viewerInstance, setViewerInstance] = useState<Viewer | null>(null);
  const wardLayerRef = useRef<WardLayer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const initRef = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, name: string, city: string } | null>(null);
  const [wardAnchors, setWardAnchors] = useState<{ wardId: string; position: Cesium.Cartesian3 }[]>([]);
  const [isTilt3D, setIsTilt3D] = useState(true);
  const buildingTilesetRef = useRef<Cesium3DTileset | null>(null);

  const activeCity = useFloodStore((s) => s.activeCity);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const ragPanelOpen = useFloodStore((s) => s.ragPanelOpen);

  // Sync Mumbai wards on map ready
  useEffect(() => {
    const viewer = viewerRef.current;
    const wardLayer = wardLayerRef.current;
    if (!viewer || !wardLayer || !mapReady) return;

    wardLayer.setCityVisible('mumbai', true);
    setWardAnchors(wardLayer.getWardAnchors('mumbai'));
    wardLayer.updateFromProfiles(useFloodStore.getState().wardRiskProfiles);
  }, [mapReady]);

  // Load Realistic 3D Buildings: Google Photorealistic 3D Tiles with OSM 3D Buildings fallback
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !mapReady || (viewer as any).isDestroyed?.() || !viewer.scene?.globe) return;
    viewer.scene.globe.show = true;
    setLoadingProgress(null);

    let cancelled = false;

    // Load Photoreal 3D Tiles first for realistic facades and textures
    loadPhotorealTileset(viewer)
      .then((ts) => {
        if (cancelled) {
          if (ts && !ts.isDestroyed()) ts.destroy();
          return;
        }
        if (ts) {
          ts.show = isTilt3D;
          buildingTilesetRef.current = ts;
          viewer.scene.requestRender();
          return;
        }
        throw new Error('Photoreal tileset returned null');
      })
      .catch((err) => {
        console.warn('[CesiumMapView] Photoreal 3D Tiles unavailable, falling back to 3D Buildings:', err);
        if (cancelled) return;
        loadOsmBuildingsTileset(viewer, { maximumScreenSpaceError: 16 }).then((ts) => {
          if (cancelled || !ts) return;
          ts.show = isTilt3D;
          buildingTilesetRef.current = ts;
          viewer.scene.requestRender();
        }).catch((fallbackErr) => {
          console.warn('[CesiumMapView] OSM 3D Buildings fallback failed:', fallbackErr);
        });
      });

    return () => {
      cancelled = true;
      if (buildingTilesetRef.current && viewer && !viewer.isDestroyed()) {
        try {
          viewer.scene.primitives.remove(buildingTilesetRef.current);
        } catch (e) {}
        buildingTilesetRef.current = null;
      }
    };
  }, [mapReady]);

  // Toggle buildings visibility on 3D vs 2D switch
  useEffect(() => {
    if (buildingTilesetRef.current) {
      buildingTilesetRef.current.show = isTilt3D;
      viewerRef.current?.scene.requestRender();
    }
  }, [isTilt3D]);

  // React to ward selection (pinned wards, ward clicks in sidebar)
  const getSelectedWard = useFloodStore((s) => s.selectedWard);

  useEffect(() => {
    if (!viewerRef.current || !selectedWardId) return;
    
    const ward = getSelectedWard();
    if (ward && ward.center) {
      flyToWard(viewerRef.current, {
        centroidLat: ward.center[1],
        centroidLng: ward.center[0]
      });
    }
  }, [selectedWardId, getSelectedWard]);

  // React to ward layer visibility changes
  const wardLayerVisibility = useFloodStore((s) => s.wardLayerVisibility);
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;

    wardLayer.setCityVisible('mumbai', wardLayerVisibility.mumbai);
  }, [wardLayerVisibility]);

  // React to risk profile changes and update ward flood layer
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (wardLayer) {
      wardLayer.updateFromProfiles(wardRiskProfiles);
    }
  }, [wardRiskProfiles, mapReady]);

  // React to fill mode changes
  const wardFillMode = useFloodStore((s) => s.wardFillMode);
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;

    wardLayer.setFillMode(wardFillMode);
  }, [wardFillMode]);

  // Initialize viewer
  useEffect(() => {
    if (initRef.current || !containerRef.current || !CESIUM_TOKEN) return;
    initRef.current = true;
    let cancelled = false;

    (window as any).CESIUM_BASE_URL = '/cesium';
    Ion.defaultAccessToken = CESIUM_TOKEN;

    // Throttle worker creation to prevent parallel chunk storms
    if (typeof window !== 'undefined' && (Cesium.FeatureDetection as any)) {
      (Cesium.FeatureDetection as any).hardwareConcurrency = 1;
    }

    // Prepare Esri satellite imagery upfront as the baseLayer
    const esriImagery = new UrlTemplateImageryProvider({
      url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      maximumLevel: 19,
      credit: 'Esri, Maxar, Earthstar Geographics',
    });

    const viewer = new Viewer(containerRef.current, {
      baseLayer: new Cesium.ImageryLayer(esriImagery),
      terrainProvider: new Cesium.EllipsoidTerrainProvider(),
      skyBox: false as any,
      skyAtmosphere: false as any,
      baseLayerPicker: false,
      geocoder: false,
      homeButton: false,
      infoBox: false,
      navigationHelpButton: false,
      sceneModePicker: false,
      selectionIndicator: false,
      timeline: false,
      animation: false,
      fullscreenButton: false,
      vrButton: false,
      projectionPicker: false,
      requestRenderMode: true,
      maximumRenderTimeChange: Infinity,
      shouldAnimate: false,
      msaaSamples: 1,
    });

    viewerRef.current = viewer;
    setViewerInstance(viewer);
    initCameraControls(viewer);

    if (viewer.scene.moon) {
      viewer.scene.moon.destroy();
      (viewer.scene as any).moon = undefined;
    }
    if (viewer.scene.sun) {
      viewer.scene.sun.destroy();
      (viewer.scene as any).sun = undefined;
    }
    viewer.scene.backgroundColor = Color.fromCssColorString('#0B0D12');

    if (process.env.NODE_ENV !== 'production') {
      // Handy for poking at the scene from the console while developing.
      (window as any).cesiumViewer = viewer;
    }

    // Restore clean base globe without terrain clipping
    viewer.scene.globe.show = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    // High-performance scene settings
    viewer.shadows = false;
    viewer.terrainShadows = Cesium.ShadowMode.DISABLED;
    viewer.resolutionScale = typeof window !== 'undefined' ? Math.min(window.devicePixelRatio || 1, 1.25) : 1.0;
    viewer.scene.globe.baseColor = Color.fromCssColorString('#0B0D12');
    viewer.scene.globe.enableLighting = false;
    
    if (viewer.scene.verticalExaggeration !== undefined) {
      viewer.scene.verticalExaggeration = 1.0;
    }
    
    if (viewer.scene.postProcessStages) {
      viewer.scene.postProcessStages.fxaa.enabled = false;
    }

    viewer.scene.fog.enabled = false;
    viewer.scene.highDynamicRange = false;
    viewer.scene.globe.showGroundAtmosphere = false;
    if (viewer.scene.skyAtmosphere) {
      viewer.scene.skyAtmosphere.show = false;
    }
    
    try {
      viewer.scene.globe.showWaterEffect = false;
    } catch (e) {}

    const creditContainer = viewer.cesiumWidget.creditContainer as HTMLElement;
    if (creditContainer) {
      creditContainer.style.background = 'transparent';
      creditContainer.style.opacity = '0.4';
      creditContainer.style.fontSize = '9px';
    }

    // Initialize the multi-city WardLayer and load initial city first for instant display
    const wardLayer = new WardLayer(viewer);
    wardLayerRef.current = wardLayer;

    const initialCity = useFloodStore.getState().activeCity || 'mumbai';

    // Fast path: load initial city first (<150ms) so map is interactive immediately
    wardLayer.loadCity(initialCity as any).then(() => {
      console.log(`[CesiumMapView] Initial city '${initialCity}' loaded — map ready`);
      setMapReady(true);
      
      wardLayer.setCityVisible(initialCity as any, true);
      setWardAnchors(wardLayer.getWardAnchors(initialCity as any));
      useFloodStore.getState().initRiskData();
    }).catch(err => console.error('[CesiumMapView] Ward layer load failed:', err));
    
    // Fly to initial city
    const center = CITY_CENTERS[initialCity as keyof typeof CITY_CENTERS] || CITY_CENTERS.mumbai;
    viewer.camera.flyTo({
      destination: Cartesian3.fromDegrees(center.lng, center.lat, center.altitude),
      orientation: {
        heading: CesiumMath.toRadians(15.0),
        pitch: CesiumMath.toRadians(-35.0), // 3D tilt
        roll: 0,
      },
      duration: 0,
    });

    // Hover Handler
    const handler = new ScreenSpaceEventHandler(viewer.scene.canvas);
    handlerRef.current = handler;
    
    let hoveredEntity: Entity | null = null;
    let originalMaterial: any = null;

    handler.setInputAction((movement: any) => {
      const picked = viewer.scene.pick(movement.endPosition);
      
      // Reset previous hover (but not if it's the selected entity)
      if (hoveredEntity && hoveredEntity.polygon && originalMaterial) {
        wardLayer.unhighlightWard(hoveredEntity, originalMaterial);
        hoveredEntity = null;
        originalMaterial = null;
        setHoverInfo(null);
      }

      if (defined(picked) && picked.id instanceof Entity && wardLayer.isWardEntity(picked.id)) {
        const pickedEntity = picked.id as Entity;
        hoveredEntity = pickedEntity;
        originalMaterial = wardLayer.highlightWard(pickedEntity);
        
        const info = wardLayer.getWardInfo(pickedEntity);
        if (info) {
          setHoverInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            name: info.wardCode !== info.wardName 
              ? `${info.wardCode} — ${info.wardName}` 
              : info.wardName,
            city: 'Mumbai',
          });
        }
      }
    }, ScreenSpaceEventType.MOUSE_MOVE);

    // Click Handler — select ward, emit to store
    handler.setInputAction((click: any) => {
      const picked = viewer.scene.pick(click.position);

      if (defined(picked) && picked.id instanceof Entity && wardLayer.isWardEntity(picked.id)) {
        const info = wardLayer.selectWard(picked.id);
        if (info) {
          useFloodStore.getState().setSelectedBoundaryWard({
            city: info.city,
            wardId: info.wardId,
            wardName: info.wardName,
            wardCode: info.wardCode,
          });
          useFloodStore.getState().setSelectedWard(info.wardId);
          useFloodStore.getState().clearRAGMessages();
          if (!useFloodStore.getState().ragPanelOpen) {
            useFloodStore.getState().toggleRAGPanel();
          }
        }
      } else {
        // Click on empty space — clear selection
        wardLayer.clearSelection();
        useFloodStore.getState().setSelectedBoundaryWard(null);
        useFloodStore.getState().setSelectedWard(null);
      }
    }, ScreenSpaceEventType.LEFT_CLICK);

    return () => {
      cancelled = true;
      setMapReady(false);
      setViewerInstance(null);
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current?.destroy();
      handlerRef.current = null;
      wardLayerRef.current?.destroy();
      wardLayerRef.current = null;
      if (!viewer.isDestroyed()) {
        viewer.destroy();
      }
      viewerRef.current = null;
      initRef.current = false;
    };
  }, []);

  if (!CESIUM_TOKEN) {
    return (
      <div className="absolute inset-0 bg-[#0B0D12] flex items-center justify-center">
        <div className="text-center max-w-md px-6">
          <p className="text-[14px] text-[#E1E4EA] font-medium mb-2">Cesium Token Required</p>
          <p className="text-[12px] text-[#525866]">
            Add your Cesium Ion token to <code className="text-[#5B8DEF]">.env</code>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      <div ref={containerRef} className="absolute inset-0 bg-transparent pointer-events-auto" />
      
      {!mapReady && (
        <div className="absolute top-8 left-1/2 -translate-x-1/2 z-50 bg-[#0A0A0A]/90 border border-white/10 backdrop-blur-md px-6 py-3 rounded-full shadow-2xl flex items-center gap-3">
          <div className="w-4 h-4 border-2 border-[#5EA977]/30 border-t-[#5EA977] rounded-full animate-spin"></div>
          <p className="text-xs font-medium text-gray-300">Loading Ward Boundaries...</p>
        </div>
      )}

      {loadingProgress !== null && (
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-[#0A0A0A]/90 border border-white/10 backdrop-blur-md px-6 py-4 rounded-xl shadow-2xl flex flex-col items-center gap-3 w-80 z-50">
          <div className="flex justify-between w-full text-xs font-medium text-gray-300">
            <span>Loading 3D Buildings...</span>
            <span className="text-[#5EA977]">{Math.round(loadingProgress)}%</span>
          </div>
          <div className="w-full h-1.5 bg-gray-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-[#5EA977] rounded-full transition-all duration-300 ease-out"
              style={{ width: `${loadingProgress}%` }}
            />
          </div>
        </div>
      )}

      {/* 3D Perspective & Reset View Controls */}
      {mapReady && (
        <div
          className={`absolute bottom-6 z-20 flex items-center gap-2 transition-all duration-300 ${
            ragPanelOpen ? 'right-[440px]' : 'right-6'
          }`}
        >
          <button
            onClick={() => {
              if (!viewerRef.current || !activeCity) return;
              const viewer = viewerRef.current;
              const view = CITY_CAMERA_VIEWS[activeCity];
              if (!view) return;

              const targetPitch = isTilt3D ? -88 : -38;
              const targetHeading = isTilt3D ? 0 : 15;

              viewer.camera.flyTo({
                destination: Cartesian3.fromDegrees(view.lng, view.lat, isTilt3D ? view.altitude * 1.15 : view.altitude),
                orientation: {
                  heading: CesiumMath.toRadians(targetHeading),
                  pitch: CesiumMath.toRadians(targetPitch),
                  roll: 0,
                },
                duration: 1.5,
              });
              setIsTilt3D(!isTilt3D);
            }}
            className="bg-[#0A0A0A]/90 hover:bg-white text-white/90 hover:text-black border border-white/10 hover:border-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all duration-300 flex items-center gap-2 shadow-xl group cursor-pointer"
          >
            <Box size={13} className={isTilt3D ? 'text-white group-hover:text-black' : 'text-zinc-400 group-hover:text-black'} />
            <span>{isTilt3D ? '3D View' : '2D Top-Down'}</span>
          </button>

          <button
            onClick={() => {
              if (viewerRef.current && activeCity) {
                flyToCity(viewerRef.current, activeCity);
                setIsTilt3D(true);
              }
            }}
            className="bg-[#0A0A0A]/90 hover:bg-white text-white/90 hover:text-black border border-white/10 hover:border-white backdrop-blur-md px-3.5 py-2 rounded-xl text-xs font-mono font-medium transition-all duration-300 flex items-center gap-2 shadow-xl group cursor-pointer"
          >
            <RefreshCw size={12} className="group-hover:rotate-180 transition-transform duration-500" />
            <span>Reset View</span>
          </button>
        </div>
      )}

      {mapReady && viewerInstance && <WardTagLayer viewer={viewerInstance} anchors={wardAnchors} />}
      {mapReady && <FloodDepthLegend />}

      {/* Tooltip for Hover */}
      {hoverInfo && (
        <div 
          className="absolute pointer-events-none px-3 py-2 bg-[#0A0A0A]/85 backdrop-blur-md border border-[#ffffff1a] rounded-lg text-white text-sm whitespace-nowrap z-50 transition-opacity duration-75"
          style={{ 
            left: hoverInfo.x + 15, 
            top: hoverInfo.y + 15 
          }}
        >
          <div className="font-medium text-[13px]">{hoverInfo.name}</div>
          <div className="text-[10px] text-[#9CA3AF] mt-0.5">{hoverInfo.city}</div>
        </div>
      )}
    </div>
  );
}
