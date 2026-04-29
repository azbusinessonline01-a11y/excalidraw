"use client";
import { nanoid } from "nanoid";
import React, {
  useEffect,
  useState,
  useRef,
  useCallback,
  Children,
  cloneElement,
} from "react";

import type * as TExcalidraw from "@excalidraw/excalidraw";
import type { ImportedLibraryData } from "@excalidraw/excalidraw/data/types";
import type {
  NonDeletedExcalidrawElement,
  Theme,
} from "@excalidraw/excalidraw/element/types";
import type {
  AppState,
  BinaryFileData,
  ExcalidrawImperativeAPI,
  ExcalidrawInitialDataState,
  Gesture,
  LibraryItems,
  PointerDownState as ExcalidrawPointerDownState,
} from "@excalidraw/excalidraw/types";

import initialData from "../initialData";
import {
  resolvablePromise,
  distance2d,
  fileOpen,
  withBatchedUpdates,
  withBatchedUpdatesThrottled,
} from "../utils";

import CustomFooter from "./CustomFooter";
import MobileFooter from "./MobileFooter";

import "./ExampleApp.scss";

import type { ResolvablePromise } from "../utils";

type Comment = {
  x: number;
  y: number;
  value: string;
  id?: string;
};

type PointerDownState = {
  x: number;
  y: number;
  hitElement: Comment;
  onMove: any;
  onUp: any;
  hitElementOffsets: { x: number; y: number };
};

const COMMENT_ICON_DIMENSION = 32;
const COMMENT_INPUT_HEIGHT = 50;
const COMMENT_INPUT_WIDTH = 150;

export interface AppProps {
  appTitle: string;
  useCustom: (api: ExcalidrawImperativeAPI | null, customArgs?: any[]) => void;
  customArgs?: any[];
  children: React.ReactNode;
  excalidrawLib: typeof TExcalidraw;
}

export default function ExampleApp({
  useCustom,
  customArgs,
  children,
  excalidrawLib,
}: AppProps) {
  const {
    exportToCanvas,
    exportToSvg,
    exportToBlob,
    exportToClipboard,
    useHandleLibrary,
    MIME_TYPES,
    sceneCoordsToViewportCoords,
    viewportCoordsToSceneCoords,
    restoreElements,
    Sidebar,
    Footer,
    WelcomeScreen,
    MainMenu,
    LiveCollaborationTrigger,
    convertToExcalidrawElements,
    TTDDialog,
    TTDDialogTrigger,
    ROUNDNESS,
    loadSceneOrLibraryFromBlob,
  } = excalidrawLib;

  const appRef = useRef<any>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [viewModeEnabled, setViewModeEnabled] = useState(false);
  const [zenModeEnabled, setZenModeEnabled] = useState(false);
  const [gridModeEnabled, setGridModeEnabled] = useState(false);
  const [renderScrollbars, setRenderScrollbars] = useState(false);
  const [exportWithDarkMode, setExportWithDarkMode] = useState(false);
  const [exportEmbedScene, setExportEmbedScene] = useState(false);
  const [theme, setTheme] = useState<Theme>("light");
  const [disableImageTool, setDisableImageTool] = useState(false);
  const [isCollaborating, setIsCollaborating] = useState(false);
  const [blobUrl, setBlobUrl] = useState<string>("");
  const [canvasUrl, setCanvasUrl] = useState<string>("");
  const [commentIcons, setCommentIcons] = useState<{ [id: string]: Comment }>(
    {},
  );
  const [comment, setComment] = useState<Comment | null>(null);
  const [pointerData, setPointerData] = useState<{
    pointer: { x: number; y: number };
    button: "down" | "up";
    pointersMap: Gesture["pointers"];
  } | null>(null);

  const initialStatePromiseRef = useRef<{
    promise: ResolvablePromise<ExcalidrawInitialDataState | null>;
  }>({ promise: null! });
  if (!initialStatePromiseRef.current.promise) {
    initialStatePromiseRef.current.promise =
      resolvablePromise<ExcalidrawInitialDataState | null>();
  }

  const [excalidrawAPI, setExcalidrawAPI] =
    useState<ExcalidrawImperativeAPI | null>(null);

  useCustom(excalidrawAPI, customArgs);
  useHandleLibrary({ excalidrawAPI });

  useEffect(() => {
    if (!excalidrawAPI) {
      return;
    }

    // Resolve immediately so the canvas never shows "Loading scene…"
    initialStatePromiseRef.current.promise.resolve({
      ...initialData,
      elements: convertToExcalidrawElements(initialData.elements),
    });

    // Load the demo image asynchronously and add it after the canvas is ready
    const fetchData = async () => {
      try {
        const res = await fetch("/images/rocket.jpeg");
        if (!res.ok) return;
        const imageData = await res.blob();
        const reader = new FileReader();
        reader.readAsDataURL(imageData);
        reader.onload = () => {
          excalidrawAPI.addFiles([
            {
              id: "rocket" as BinaryFileData["id"],
              dataURL: reader.result as BinaryFileData["dataURL"],
              mimeType: MIME_TYPES.jpg,
              created: 1644915140367,
              lastRetrieved: 1644915140367,
            },
          ]);
        };
      } catch {
        // image is optional, canvas already loaded
      }
    };
    fetchData();
  }, [excalidrawAPI, convertToExcalidrawElements, MIME_TYPES]);

  // ── Actions ────────────────────────────────────────────────────────────────

  const loadSceneOrLibrary = async () => {
    const file = await fileOpen({ description: "Excalidraw or library file" });
    const contents = await loadSceneOrLibraryFromBlob(file, null, null);
    if (contents.type === MIME_TYPES.excalidraw) {
      excalidrawAPI?.updateScene(contents.data as any);
    } else if (contents.type === MIME_TYPES.excalidrawlib) {
      excalidrawAPI?.updateLibrary({
        libraryItems: (contents.data as ImportedLibraryData).libraryItems!,
        openLibraryMenu: true,
      });
    }
  };

  const updateScene = () => {
    excalidrawAPI?.updateScene({
      elements: restoreElements(
        convertToExcalidrawElements([
          {
            type: "rectangle",
            id: "rect-1",
            fillStyle: "hachure",
            strokeWidth: 1,
            strokeStyle: "solid",
            roughness: 1,
            angle: 0,
            x: 100.50390625,
            y: 93.67578125,
            strokeColor: "#c92a2a",
            width: 186.47265625,
            height: 141.9765625,
            seed: 1968410350,
            roundness: { type: ROUNDNESS.ADAPTIVE_RADIUS, value: 32 },
          },
          { type: "arrow", x: 300, y: 150, start: { id: "rect-1" }, end: { type: "ellipse" } },
          { type: "text", x: 300, y: 100, text: "HELLO WORLD!" },
        ]),
        null,
      ),
      appState: { viewBackgroundColor: "#edf2ff" },
    });
  };

  const onCopy = async (type: "png" | "svg" | "json") => {
    if (!excalidrawAPI) return;
    await exportToClipboard({
      elements: excalidrawAPI.getSceneElements(),
      appState: excalidrawAPI.getAppState(),
      files: excalidrawAPI.getFiles(),
      type,
    });
    window.alert(`Copied to clipboard as ${type}`);
  };

  const onLinkOpen = useCallback(
    (
      element: NonDeletedExcalidrawElement,
      event: CustomEvent<{
        nativeEvent: MouseEvent | React.PointerEvent<HTMLCanvasElement>;
      }>,
    ) => {
      const link = element.link!;
      const { nativeEvent } = event.detail;
      const isNewTab = nativeEvent.ctrlKey || nativeEvent.metaKey;
      const isNewWindow = nativeEvent.shiftKey;
      const isInternalLink =
        link.startsWith("/") || link.includes(window.location.origin);
      if (isInternalLink && !isNewTab && !isNewWindow) {
        event.preventDefault();
      }
    },
    [],
  );

  const onPointerDown = (
    activeTool: AppState["activeTool"],
    pointerDownState: ExcalidrawPointerDownState,
  ) => {
    if (activeTool.type === "custom" && activeTool.customType === "comment") {
      const { x, y } = pointerDownState.origin;
      setComment({ x, y, value: "" });
    }
  };

  const rerenderCommentIcons = () => {
    if (!excalidrawAPI) return;
    const commentIconsElements = appRef.current.querySelectorAll(
      ".comment-icon",
    ) as HTMLElement[];
    commentIconsElements.forEach((ele) => {
      const id = ele.id;
      const appstate = excalidrawAPI.getAppState();
      const { x, y } = sceneCoordsToViewportCoords(
        { sceneX: commentIcons[id].x, sceneY: commentIcons[id].y },
        appstate,
      );
      ele.style.left = `${x - COMMENT_ICON_DIMENSION / 2 - appstate!.offsetLeft}px`;
      ele.style.top = `${y - COMMENT_ICON_DIMENSION / 2 - appstate!.offsetTop}px`;
    });
  };

  const onPointerMoveFromPointerDownHandler = (
    pointerDownState: PointerDownState,
  ) =>
    withBatchedUpdatesThrottled((event) => {
      if (!excalidrawAPI) return;
      const { x, y } = viewportCoordsToSceneCoords(
        {
          clientX: event.clientX - pointerDownState.hitElementOffsets.x,
          clientY: event.clientY - pointerDownState.hitElementOffsets.y,
        },
        excalidrawAPI.getAppState(),
      );
      setCommentIcons({
        ...commentIcons,
        [pointerDownState.hitElement.id!]: {
          ...commentIcons[pointerDownState.hitElement.id!],
          x,
          y,
        },
      });
    });

  const onPointerUpFromPointerDownHandler = (
    pointerDownState: PointerDownState,
  ) =>
    withBatchedUpdates((event) => {
      window.removeEventListener("pointermove", pointerDownState.onMove);
      window.removeEventListener("pointerup", pointerDownState.onUp);
      excalidrawAPI?.setActiveTool({ type: "selection" });
      const distance = distance2d(
        pointerDownState.x,
        pointerDownState.y,
        event.clientX,
        event.clientY,
      );
      if (distance === 0) {
        if (!comment) {
          setComment({
            x: pointerDownState.hitElement.x + 60,
            y: pointerDownState.hitElement.y,
            value: pointerDownState.hitElement.value,
            id: pointerDownState.hitElement.id,
          });
        } else {
          setComment(null);
        }
      }
    });

  const saveComment = () => {
    if (!comment) return;
    if (!comment.id && !comment.value) { setComment(null); return; }
    const id = comment.id || nanoid();
    setCommentIcons({
      ...commentIcons,
      [id]: {
        x: comment.id ? comment.x - 60 : comment.x,
        y: comment.y,
        id,
        value: comment.value,
      },
    });
    setComment(null);
  };

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderCommentIcons = () =>
    Object.values(commentIcons).map((commentIcon) => {
      if (!excalidrawAPI) return null;
      const appState = excalidrawAPI.getAppState();
      const { x, y } = sceneCoordsToViewportCoords(
        { sceneX: commentIcon.x, sceneY: commentIcon.y },
        appState,
      );
      return (
        <div
          id={commentIcon.id}
          key={commentIcon.id}
          className="comment-icon"
          style={{
            top: `${y - COMMENT_ICON_DIMENSION / 2 - appState!.offsetTop}px`,
            left: `${x - COMMENT_ICON_DIMENSION / 2 - appState!.offsetLeft}px`,
            position: "absolute",
            zIndex: 1,
            width: `${COMMENT_ICON_DIMENSION}px`,
            height: `${COMMENT_ICON_DIMENSION}px`,
            cursor: "pointer",
            touchAction: "none",
          }}
          onPointerDown={(event) => {
            event.preventDefault();
            if (comment) {
              commentIcon.value = comment.value;
              saveComment();
            }
            const state: any = {
              x: event.clientX,
              y: event.clientY,
              hitElement: commentIcon,
              hitElementOffsets: { x: event.clientX - x, y: event.clientY - y },
            };
            const onPointerMove = onPointerMoveFromPointerDownHandler(state);
            const onPointerUp = onPointerUpFromPointerDownHandler(state);
            window.addEventListener("pointermove", onPointerMove);
            window.addEventListener("pointerup", onPointerUp);
            state.onMove = onPointerMove;
            state.onUp = onPointerUp;
            excalidrawAPI?.setActiveTool({ type: "custom", customType: "comment" });
          }}
        >
          <div className="comment-avatar">
            <img src="images/doremon.png" alt="doremon" />
          </div>
        </div>
      );
    });

  const renderComment = () => {
    if (!comment) return null;
    const appState = excalidrawAPI?.getAppState()!;
    const { x, y } = sceneCoordsToViewportCoords(
      { sceneX: comment.x, sceneY: comment.y },
      appState,
    );
    let top = y - COMMENT_ICON_DIMENSION / 2 - appState.offsetTop;
    let left = x - COMMENT_ICON_DIMENSION / 2 - appState.offsetLeft;
    if (top + COMMENT_INPUT_HEIGHT < appState.offsetTop + COMMENT_INPUT_HEIGHT) top = COMMENT_ICON_DIMENSION / 2;
    if (top + COMMENT_INPUT_HEIGHT > appState.height) top = appState.height - COMMENT_INPUT_HEIGHT - COMMENT_ICON_DIMENSION / 2;
    if (left + COMMENT_INPUT_WIDTH < appState.offsetLeft + COMMENT_INPUT_WIDTH) left = COMMENT_ICON_DIMENSION / 2;
    if (left + COMMENT_INPUT_WIDTH > appState.width) left = appState.width - COMMENT_INPUT_WIDTH - COMMENT_ICON_DIMENSION / 2;
    return (
      <textarea
        className="comment"
        style={{ top: `${top}px`, left: `${left}px`, position: "absolute", zIndex: 1, height: `${COMMENT_INPUT_HEIGHT}px`, width: `${COMMENT_INPUT_WIDTH}px` }}
        ref={(ref) => { setTimeout(() => ref?.focus()); }}
        placeholder={comment.value ? "Reply" : "Comment"}
        value={comment.value}
        onChange={(e) => setComment({ ...comment, value: e.target.value })}
        onBlur={saveComment}
        onKeyDown={(e) => { if (!e.shiftKey && e.key === "Enter") { e.preventDefault(); saveComment(); } }}
      />
    );
  };

  const renderTopRightUI = (isMobile: boolean) => {
    if (isMobile) return null;
    return (
      <LiveCollaborationTrigger
        isCollaborating={isCollaborating}
        onSelect={() => window.alert("Collab dialog clicked")}
      />
    );
  };

  const renderMenu = () => (
    <MainMenu>
      <MainMenu.DefaultItems.SaveAsImage />
      <MainMenu.DefaultItems.Export />
      <MainMenu.Separator />
      <MainMenu.DefaultItems.LiveCollaborationTrigger
        isCollaborating={isCollaborating}
        onSelect={() => window.alert("You clicked on collab button")}
      />
      <MainMenu.Group title="Excalidraw links">
        <MainMenu.DefaultItems.Socials />
      </MainMenu.Group>
      <MainMenu.Separator />
      <MainMenu.DefaultItems.Help />
      {excalidrawAPI && (
        <MobileFooter excalidrawLib={excalidrawLib} excalidrawAPI={excalidrawAPI} />
      )}
    </MainMenu>
  );

  const renderExcalidraw = (children: React.ReactNode) => {
    const ExcalidrawEl: any = Children.toArray(children).find(
      (child) =>
        React.isValidElement(child) &&
        typeof child.type !== "string" &&
        //@ts-ignore
        child.type.displayName === "Excalidraw",
    );
    if (!ExcalidrawEl) return null;
    return cloneElement(ExcalidrawEl, {
      excalidrawAPI: (api: ExcalidrawImperativeAPI) => setExcalidrawAPI(api),
      initialData: initialStatePromiseRef.current.promise,
      onChange: (elements: NonDeletedExcalidrawElement[], state: AppState) => {
        console.info("Elements :", elements, "State :", state);
      },
      onPointerUpdate: (payload: {
        pointer: { x: number; y: number };
        button: "down" | "up";
        pointersMap: Gesture["pointers"];
      }) => setPointerData(payload),
      viewModeEnabled,
      zenModeEnabled,
      renderScrollbars,
      gridModeEnabled,
      theme,
      name: "Custom name of drawing",
      UIOptions: {
        canvasActions: { loadScene: false },
        tools: { image: !disableImageTool },
      },
      renderTopRightUI,
      onLinkOpen,
      onPointerDown,
      onScrollChange: rerenderCommentIcons,
      validateEmbeddable: true,
    },
      <>
        {excalidrawAPI && (
          <Footer>
            <CustomFooter excalidrawAPI={excalidrawAPI} excalidrawLib={excalidrawLib} />
          </Footer>
        )}
        <WelcomeScreen />
        <Sidebar name="custom">
          <Sidebar.Tabs>
            <Sidebar.Header />
            <Sidebar.Tab tab="one">Tab one!</Sidebar.Tab>
            <Sidebar.Tab tab="two">Tab two!</Sidebar.Tab>
            <Sidebar.TabTriggers>
              <Sidebar.TabTrigger tab="one">One</Sidebar.TabTrigger>
              <Sidebar.TabTrigger tab="two">Two</Sidebar.TabTrigger>
            </Sidebar.TabTriggers>
          </Sidebar.Tabs>
        </Sidebar>
        {renderMenu()}
        {excalidrawAPI && (
          <TTDDialogTrigger icon={<span>😀</span>}>Text to diagram</TTDDialogTrigger>
        )}
        <TTDDialog
          onTextSubmit={async (_) => {
            await new Promise((resolve) => setTimeout(resolve, 2000));
            throw new Error("error, go away now");
          }}
        />
      </>
    );
  };

  // ── Settings panel ─────────────────────────────────────────────────────────

  const renderSettingsPanel = () => (
    <>
      {/* backdrop */}
      {panelOpen && (
        <div className="settings-backdrop" onClick={() => setPanelOpen(false)} />
      )}

      {/* toggle button */}
      <button
        className="settings-trigger"
        onClick={() => setPanelOpen((o) => !o)}
        title="Settings & Tools"
        aria-label="Open settings panel"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="3" />
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
        </svg>
      </button>

      {/* panel */}
      <div className={`settings-panel ${panelOpen ? "settings-panel--open" : ""}`}>
        <div className="settings-panel__header">
          <span>Dev Controls</span>
          <button className="settings-panel__close" onClick={() => setPanelOpen(false)}>
            ✕
          </button>
        </div>

        <div className="settings-panel__body">

          {/* Cursor coords */}
          <div className="settings-group">
            <div className="settings-coords">
              <span>x: {pointerData?.pointer.x ?? 0}</span>
              <span>y: {pointerData?.pointer.y ?? 0}</span>
            </div>
          </div>

          {/* Scene actions */}
          <div className="settings-group">
            <div className="settings-group__label">Scene</div>
            <div className="settings-btns">
              <button onClick={loadSceneOrLibrary}>Load scene / library</button>
              <button onClick={updateScene}>Update scene</button>
              <button onClick={() => excalidrawAPI?.resetScene()}>Reset scene</button>
              <button
                onClick={() => {
                  const libraryItems: LibraryItems = [
                    { status: "published", id: "1", created: 1, elements: initialData.libraryItems[1] as any },
                    { status: "unpublished", id: "2", created: 2, elements: initialData.libraryItems[1] as any },
                  ];
                  excalidrawAPI?.updateLibrary({ libraryItems });
                }}
              >
                Update library
              </button>
            </div>
          </div>

          {/* View options */}
          <div className="settings-group">
            <div className="settings-group__label">View</div>
            <div className="settings-toggles">
              {[
                ["View mode", viewModeEnabled, () => setViewModeEnabled((v) => !v)],
                ["Zen mode", zenModeEnabled, () => setZenModeEnabled((v) => !v)],
                ["Grid mode", gridModeEnabled, () => setGridModeEnabled((v) => !v)],
                ["Render scrollbars", renderScrollbars, () => setRenderScrollbars((v) => !v)],
                ["Dark theme", theme === "dark", () => setTheme((t) => (t === "light" ? "dark" : "light"))],
                ["Disable image tool", disableImageTool, () => setDisableImageTool((v) => !v)],
                [
                  "Show collaborators",
                  isCollaborating,
                  () => {
                    if (!isCollaborating) {
                      const collaborators = new Map();
                      collaborators.set("id1", { username: "Doremon", avatarUrl: "images/doremon.png" });
                      collaborators.set("id2", { username: "Excalibot", avatarUrl: "images/excalibot.png" });
                      collaborators.set("id3", { username: "Pika", avatarUrl: "images/pika.jpeg" });
                      collaborators.set("id4", { username: "fallback", avatarUrl: "https://example.com" });
                      excalidrawAPI?.updateScene({ collaborators });
                    } else {
                      excalidrawAPI?.updateScene({ collaborators: new Map() });
                    }
                    setIsCollaborating((v) => !v);
                  },
                ],
              ].map(([label, checked, toggle]) => (
                <label key={label as string} className="settings-toggle">
                  <span>{label as string}</span>
                  <button
                    role="switch"
                    aria-checked={checked as boolean}
                    className={`toggle-switch ${checked ? "toggle-switch--on" : ""}`}
                    onClick={toggle as () => void}
                  />
                </label>
              ))}
            </div>
          </div>

          {/* Clipboard */}
          <div className="settings-group">
            <div className="settings-group__label">Copy to clipboard</div>
            <div className="settings-btns">
              <button onClick={() => onCopy("png")}>PNG</button>
              <button onClick={() => onCopy("svg")}>SVG</button>
              <button onClick={() => onCopy("json")}>JSON</button>
            </div>
          </div>

          {/* Export options */}
          <div className="settings-group">
            <div className="settings-group__label">Export</div>
            <div className="settings-toggles">
              <label className="settings-toggle">
                <span>Dark mode</span>
                <button
                  role="switch"
                  aria-checked={exportWithDarkMode}
                  className={`toggle-switch ${exportWithDarkMode ? "toggle-switch--on" : ""}`}
                  onClick={() => setExportWithDarkMode((v) => !v)}
                />
              </label>
              <label className="settings-toggle">
                <span>Embed scene</span>
                <button
                  role="switch"
                  aria-checked={exportEmbedScene}
                  className={`toggle-switch ${exportEmbedScene ? "toggle-switch--on" : ""}`}
                  onClick={() => setExportEmbedScene((v) => !v)}
                />
              </label>
            </div>
            <div className="settings-btns" style={{ marginTop: "0.5rem" }}>
              <button
                onClick={async () => {
                  if (!excalidrawAPI) return;
                  const svg = await exportToSvg({
                    elements: excalidrawAPI.getSceneElements(),
                    appState: { ...initialData.appState, exportWithDarkMode, exportEmbedScene, width: 300, height: 100 },
                    files: excalidrawAPI.getFiles(),
                  });
                  appRef.current.querySelector(".export-svg").innerHTML = svg.outerHTML;
                }}
              >
                Export SVG
              </button>
              <button
                onClick={async () => {
                  if (!excalidrawAPI) return;
                  const blob = await exportToBlob({
                    elements: excalidrawAPI.getSceneElements(),
                    mimeType: "image/png",
                    appState: { ...initialData.appState, exportEmbedScene, exportWithDarkMode },
                    files: excalidrawAPI.getFiles(),
                  });
                  setBlobUrl(window.URL.createObjectURL(blob));
                }}
              >
                Export PNG
              </button>
              <button
                onClick={async () => {
                  if (!excalidrawAPI) return;
                  const canvas = await exportToCanvas({
                    elements: excalidrawAPI.getSceneElements(),
                    appState: { ...initialData.appState, exportWithDarkMode },
                    files: excalidrawAPI.getFiles(),
                  });
                  const ctx = canvas.getContext("2d")!;
                  ctx.font = "30px Excalifont";
                  ctx.strokeText("My custom text", 50, 60);
                  setCanvasUrl(canvas.toDataURL());
                }}
              >
                Export canvas
              </button>
            </div>
            {/* preview thumbnails */}
            <div className="export-previews">
              <div className="export-svg" />
              {blobUrl && <img src={blobUrl} alt="png export" />}
              {canvasUrl && <img src={canvasUrl} alt="canvas export" />}
            </div>
          </div>

        </div>
      </div>
    </>
  );

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="App" ref={appRef}>
      <div className="excalidraw-wrapper">
        {renderExcalidraw(children)}
        {Object.keys(commentIcons).length > 0 && renderCommentIcons()}
        {comment && renderComment()}
        {renderSettingsPanel()}
      </div>
    </div>
  );
}
