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
  LightingModel,
  ScreenSpaceEventHandler,
  ScreenSpaceEventType,
  defined,
  Entity,
  ColorMaterialProperty,
} from 'cesium';
import { useFloodStore } from '@/store/flood-store';
import { WardLayer } from '@/lib/gis/WardLayer';
import { CITY_CENTERS } from '@/lib/gis/WardData';
import { flyToCity, flyToWard, initCameraControls, CITY_CAMERA_VIEWS } from '@/lib/gis/cameraController';
import { Box, RefreshCw } from 'lucide-react';

const CESIUM_TOKEN = process.env.NEXT_PUBLIC_CESIUM_TOKEN || '';

import WardTagLayer from './WardTagLayer';

export default function CesiumMapView() {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<Viewer | null>(null);
  const [loadingProgress, setLoadingProgress] = useState<number | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const wardLayerRef = useRef<WardLayer | null>(null);
  const handlerRef = useRef<ScreenSpaceEventHandler | null>(null);
  const initRef = useRef(false);

  const [hoverInfo, setHoverInfo] = useState<{ x: number, y: number, name: string, city: string } | null>(null);
  const [wardAnchors, setWardAnchors] = useState<{ wardId: string; position: Cesium.Cartesian3 }[]>([]);
  const [isTilt3D, setIsTilt3D] = useState(true);

  const activeCity = useFloodStore((s) => s.activeCity);
  const selectedWardId = useFloodStore((s) => s.selectedWardId);
  const setSelectedWard = useFloodStore((s) => s.setSelectedWard);
  const wardRiskProfiles = useFloodStore((s) => s.wardRiskProfiles);
  const ragPanelOpen = useFloodStore((s) => s.ragPanelOpen);

  // Handle city switching — fly camera to new city and ensure ONLY active city's wards are visible
  useEffect(() => {
    const viewer = viewerRef.current;
    const wardLayer = wardLayerRef.current;
    if (!viewer || !wardLayer || !activeCity || !mapReady) return;

    wardLayer.loadCity(activeCity as any).then(() => {
      // Only make the active city visible, hide all other cities to eliminate extra load
      for (const c of ['mumbai', 'pune', 'navi_mumbai'] as const) {
        wardLayer.setCityVisible(c, c === activeCity);
      }
      setWardAnchors(wardLayer.getWardAnchors(activeCity as any));
      wardLayer.updateFromProfiles(useFloodStore.getState().wardRiskProfiles);
      flyToCity(viewer, activeCity);
    }).catch(err => {
      console.warn(`[CesiumMapView] Failed to switch to city ${activeCity}:`, err);
    });
  }, [activeCity, mapReady]);

  // 3D Buildings bypassed to ensure 60fps ultra-smooth performance and prevent GPU memory spikes
  useEffect(() => {
    const viewer = viewerRef.current;
    if (!viewer || !mapReady) return;
    viewer.scene.globe.show = true;
    setLoadingProgress(null);
  }, [mapReady]);

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

  // React to ward layer visibility changes — useEffect subscription to avoid re-rendering canvas
  const wardLayerVisibility = useFloodStore((s) => s.wardLayerVisibility);
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;

    wardLayer.setCityVisible('mumbai', wardLayerVisibility.mumbai);
    wardLayer.setCityVisible('pune', wardLayerVisibility.pune);
    wardLayer.setCityVisible('navi_mumbai', wardLayerVisibility.navi_mumbai);
  }, [wardLayerVisibility]);

  // React to risk profile changes and update map pins
  useEffect(() => {
    const wardLayer = wardLayerRef.current;
    if (!wardLayer) return;
    
    wardLayer.updateFromProfiles(wardRiskProfiles);
  }, [wardRiskProfiles, mapReady]); // Depend on mapReady to ensure initial severities are painted when ward layers finish loading

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

    // Restore base globe
    viewer.scene.globe.show = true;
    viewer.scene.globe.depthTestAgainstTerrain = false;

    // High-performance scene settings (disabled heavy shadow maps for smooth 60 FPS)
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
          const cityLabel = info.city === 'navi_mumbai' ? 'Navi Mumbai' : 
                           info.city.charAt(0).toUpperCase() + info.city.slice(1);
          setHoverInfo({
            x: movement.endPosition.x,
            y: movement.endPosition.y,
            name: info.wardCode !== info.wardName 
              ? `${info.wardCode} — ${info.wardName}` 
              : info.wardName,
            city: cityLabel,
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
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.MOUSE_MOVE);
      handlerRef.current?.removeInputAction(ScreenSpaceEventType.LEFT_CLICK);
      handlerRef.current?.destroy();
      wardLayerRef.current?.destroy();
      viewer.destroy();
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

      {mapReady && <WardTagLayer viewer={viewerRef.current} anchors={wardAnchors} />}

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
