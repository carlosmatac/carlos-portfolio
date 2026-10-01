"use client";

import "@xyflow/react/dist/style.css";
import "./work-board.css";
import {
  Background, BackgroundVariant, Controls, getViewportForBounds, Handle, MiniMap, Position, ReactFlow, ReactFlowProvider, useNodesState, useReactFlow,
  type Edge, type FitViewOptions, type Node, type NodeProps, type Viewport,
} from "@xyflow/react";
import Image from "next/image";
import { memo, useCallback, useEffect, useMemo, useState, type CSSProperties, type KeyboardEvent } from "react";
import { EVENTS } from "@/content/events";
import { projects } from "@/content/projects";
import { STACK } from "@/content/stack";
import { boardLayout, EVENT_PLACEMENTS, STACK_TILE, stackLayout, stackPanel } from "@/content/work-board";
import { DetailWindow, EventDetail, paletteStyle, ProjectDetail, ToolDetail } from "./DetailWindow";
import ProjectArt from "./ProjectArt";

type Floating = { float: number; delay: number };
type ProjectNode = Node<{ slug: string; width: number; height: number } & Floating, "project">;
type EventNode = Node<{ id: string; width: number; height: number } & Floating, "event">;
type ToolNode = Node<{ id: string } & Floating, "tool">;
type LabelNode = Node<{ text: string; heading?: boolean }, "label">;
type PanelNode = Node<{ width: number; height: number }, "panel">;
type BoardNode = ProjectNode | EventNode | ToolNode | LabelNode | PanelNode;

const bySlug = new Map(projects.map(project => [project.slug, project]));
const byEvent = new Map(EVENTS.map(event => [event.id, event]));
const byTool = new Map(STACK.map(tool => [`stack-${tool.id}`, tool]));
const openable = (id: string) => bySlug.has(id) || byEvent.has(id) || byTool.has(id);
const floating = (data: Floating) => ({ "--float": `${data.float}s`, "--delay": `${data.delay}s` }) as CSSProperties;

/** Edges need anchor points; they stay invisible because the board is not an editor. */
const Anchor = ({ type, position }: { type: "source" | "target"; position: Position }) =>
  <Handle type={type} position={position} isConnectable={false} className="board-anchor" />;

/** A preview in glass over a blurred, grainy field of the project's colours, with its caption inside. */
const ProjectCard = memo(function ProjectCard({ data, selected }: NodeProps<ProjectNode>) {
  const project = bySlug.get(data.slug)!;
  return (
    <div className="board-card" data-selected={selected} data-featured={project.featured ?? false} style={{ ...floating(data), ...paletteStyle(project.palette), width: data.width }}>
      <div className="board-card-frame" style={{ height: data.height + CAPTION }}>
        <div className="board-card-art"><ProjectArt project={project} /></div>
        <p className="board-card-title"><b>{project.featured && <span className="project-featured board-card-chip">Featured</span>}{project.title}</b><span>{project.year}</span></p>
        <p className="board-card-detail">{project.role} · {project.tags.slice(0, 2).join(", ")}</p>
      </div>
      <Anchor type="source" position={Position.Bottom} />
    </div>
  );
});

const EventCard = memo(function EventCard({ data, selected }: NodeProps<EventNode>) {
  const event = byEvent.get(data.id)!;
  return (
    <div className="board-card" data-selected={selected} style={{ ...floating(data), ...paletteStyle(event.palette), width: data.width }}>
      <Anchor type="target" position={Position.Top} />
      <div className="board-card-frame" style={{ height: data.height + CAPTION }}>
        <div className="board-card-art event-art">
          <Image src={event.image.src} alt="" width={event.image.width} height={event.image.height} unoptimized />
        </div>
        <p className="board-card-title">{event.title}</p>
        <p className="board-card-detail">{event.meta}</p>
      </div>
    </div>
  );
});

const ToolTile = memo(function ToolTile({ id, data, selected }: NodeProps<ToolNode>) {
  const tool = byTool.get(id)!;
  return (
    <div className="board-card" data-selected={selected} style={floating(data)}>
      <div className="stack-tile" data-style={tool.style} title={tool.name}>
        <Image src={tool.icon} alt="" width={STACK_TILE} height={STACK_TILE} unoptimized />
      </div>
    </div>
  );
});

const BoardLabel = memo(function BoardLabel({ data }: NodeProps<LabelNode>) {
  return data.heading
    ? <div className="board-heading"><h2>Stack</h2><p>Tools I build with · open any logo</p></div>
    : <p className="board-label">{data.text}</p>;
});

/** The coloured field the Stack's glass tiles float over. */
const StackPanel = memo(function StackPanel({ data }: NodeProps<PanelNode>) {
  return <div className="stack-panel" style={{ width: data.width, height: data.height }} />;
});

const nodeTypes = { project: ProjectCard, event: EventCard, tool: ToolTile, label: BoardLabel, panel: StackPanel };
/** Room for the caption inside each card frame; layouts reserve it below every preview. */
const CAPTION = 44;

export function boardNodes(compact = false): BoardNode[] {
  const cards: BoardNode[] = boardLayout(compact).map(({ slug, x, y, ...data }) => ({
    id: slug, type: "project", position: { x, y }, data: { slug, ...data },
    ariaRole: "button", ariaLabel: `${bySlug.get(slug)!.title}, ${bySlug.get(slug)!.year}. Open project`,
  }));
  const events: BoardNode[] = EVENTS.map(event => {
    const { x, y, ...data } = EVENT_PLACEMENTS[event.id][compact ? "compact" : "wide"];
    return { id: event.id, type: "event", position: { x, y }, data: { id: event.id, ...data }, ariaRole: "button", ariaLabel: `${event.title}. Open event` };
  });
  const stack = stackLayout(compact);
  const label = (id: string, position: { x: number; y: number }, data: LabelNode["data"]): LabelNode =>
    ({ id, type: "label", position, data, draggable: false, selectable: false, focusable: false });
  const labels = [
    label("stack-heading", stack.heading, { text: "Stack", heading: true }),
    ...stack.labels.map(({ id, text, x, y }) => label(id, { x, y }, { text })),
  ];
  const { x, y, width, height } = stackPanel(compact);
  const panel: PanelNode = { id: "stack-panel", type: "panel", position: { x, y }, data: { width, height }, zIndex: -1, draggable: false, selectable: false, focusable: false };
  const tools: BoardNode[] = stack.tools.map(({ id, x, y, ...data }) => ({
    id, type: "tool", position: { x, y }, data: { id, ...data }, ariaRole: "button", ariaLabel: `${byTool.get(id)!.name}. How I use it`,
  }));
  return [panel, ...cards, ...events, ...labels, ...tools];
}

export const BOARD_EDGES: Edge[] = EVENTS.map(event => ({
  id: `${event.project}-${event.id}`, source: event.project, target: event.id,
  type: "default", animated: true, focusable: false, selectable: false,
  label: "built at", className: "board-edge",
}));

const PROJECT_AREA = [...projects.map(project => ({ id: project.slug })), ...EVENTS.map(event => ({ id: event.id }))];
const STACK_AREA = [{ id: "stack-heading" }, ...STACK.map(tool => ({ id: `stack-${tool.id}` }))];
/** Keeps the previews clear of the floating header and the board title. */
const PADDING = { padding: { top: "190px", right: "48px", bottom: "72px", left: "48px" }, maxZoom: 2.2 } satisfies FitViewOptions;
const PADDING_COMPACT = { padding: { top: "150px", right: "12px", bottom: "40px", left: "12px" }, maxZoom: 1 } satisfies FitViewOptions;
/** Narrow screens open on the first two featured projects and the first logos; the rest is a pan away. */
const AREAS = {
  projects: { wide: PROJECT_AREA, compact: [{ id: "aksum" }, { id: "zhivel" }] },
  stack: { wide: STACK_AREA, compact: [{ id: "stack-heading" }, ...STACK.slice(0, 10).map(tool => ({ id: `stack-${tool.id}` }))] },
};
type Area = keyof typeof AREAS;
const COMPACT_QUERY = "(max-width: 640px)";

function Board({ compact, onOpen, onClose }: { compact: boolean; onOpen: (id: string) => void; onClose: () => void }) {
  const initial = useMemo(() => boardNodes(compact), [compact]);
  const [nodes, , onNodesChange] = useNodesState(initial);
  const [area, setArea] = useState<Area>("projects");
  const flow = useReactFlow<BoardNode>();
  const padding = compact ? PADDING_COMPACT : PADDING;
  const stackStart = stackLayout(compact).heading.y;

  function go(next: Area) {
    setArea(next);
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    // Computed directly: fitView() with controlled nodes waits for a node update that never comes.
    const bounds = flow.getNodesBounds(AREAS[next][compact ? "compact" : "wide"].map(node => node.id));
    const viewport = getViewportForBounds(bounds, window.innerWidth, window.innerHeight, 0.25, padding.maxZoom, padding.padding);
    void flow.setViewport(viewport, { duration: reduced ? 0 : 900 });
  }
  function follow(_: unknown, viewport: Viewport) {
    const centre = (window.innerHeight / 2 - viewport.y) / viewport.zoom;
    setArea(centre > stackStart - 60 ? "stack" : "projects");
  }

  return (
    <>
      <div className="work-board-intro">
        <h1>My work</h1>
        <div className="work-board-areas" role="group" aria-label="Board areas">
          <button type="button" aria-pressed={area === "projects"} onClick={() => go("projects")}>Projects <span>{String(projects.length).padStart(2, "0")}</span></button>
          <button type="button" aria-pressed={area === "stack"} onClick={() => go("stack")}>Stack <span>{STACK.length}</span></button>
        </div>
      </div>
      <div className="work-board-canvas">
        <ReactFlow<BoardNode>
          nodes={nodes} edges={BOARD_EDGES} onNodesChange={onNodesChange} nodeTypes={nodeTypes} colorMode="dark"
          onNodeClick={(_, node) => { if (openable(node.id)) onOpen(node.id); }} onPaneClick={onClose} onMoveEnd={follow}
          fitView fitViewOptions={{ ...padding, nodes: AREAS.projects[compact ? "compact" : "wide"] }} minZoom={0.25} maxZoom={2.2}
          panOnScroll zoomOnPinch zoomOnDoubleClick={false} nodesConnectable={false} elementsSelectable edgesFocusable={false}
          aria-label="Board of projects and tools"
        >
          <Background variant={BackgroundVariant.Dots} gap={28} size={1} color="#ffffff14" />
          <MiniMap position="bottom-left" pannable zoomable nodeBorderRadius={2} maskColor="rgba(3, 4, 7, 0.72)" ariaLabel="Board overview"
            nodeColor={node => bySlug.get(node.id)?.featured || byEvent.has(node.id) ? "#e5d3ae" : node.type === "label" ? "transparent" : node.type === "panel" ? "#1a2140" : "#6f7fd8"} />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </div>
    </>
  );
}

export default function WorkBoard() {
  const [open, setOpen] = useState<string | null>(null);
  const [compact, setCompact] = useState(false);

  const show = useCallback((id: string | null) => {
    setOpen(id);
    history.replaceState(null, "", id ? `#${id}` : location.pathname + location.search);
  }, []);
  const hide = useCallback(() => show(null), [show]);

  useEffect(() => {
    const fromHash = () => { const id = decodeURIComponent(location.hash.slice(1)); setOpen(openable(id) ? id : null); };
    fromHash();
    window.addEventListener("hashchange", fromHash);
    const narrow = window.matchMedia(COMPACT_QUERY);
    const fit = () => setCompact(narrow.matches);
    fit();
    narrow.addEventListener("change", fit);
    return () => { window.removeEventListener("hashchange", fromHash); narrow.removeEventListener("change", fit); };
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key !== "Enter" && event.key !== " ") return;
    const id = (event.target as HTMLElement).closest(".react-flow__node")?.getAttribute("data-id");
    if (id && openable(id)) { event.preventDefault(); show(id); }
  }

  const titleId = open ? `detail-${open}-title` : "";
  const project = open ? bySlug.get(open) : undefined, event = open ? byEvent.get(open) : undefined, tool = open ? byTool.get(open) : undefined;
  return (
    <main className="work-board" data-drawer={open ? "open" : "closed"} onKeyDown={onKeyDown}>
      {/* Remounting per layout re-runs fitView for the new arrangement. */}
      <div className="work-board-stage" inert={!!open}>
        <ReactFlowProvider key={compact ? "compact" : "wide"}>
          <Board compact={compact} onOpen={show} onClose={hide} />
        </ReactFlowProvider>
      </div>
      <DetailWindow open={!!open} labelledBy={titleId} size={project ? "wide" : "narrow"} palette={(project ?? event)?.palette} onClose={hide}>
        {project && <ProjectDetail project={project} titleId={titleId} />}
        {event && <EventDetail event={event} project={bySlug.get(event.project)} titleId={titleId} onOpenProject={() => show(event.project)} />}
        {tool && <ToolDetail tool={tool} titleId={titleId} />}
      </DetailWindow>
    </main>
  );
}
