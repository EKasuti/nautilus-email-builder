"use client";

import { Fragment, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Undo2, Redo2, Monitor, Smartphone, Pencil, Eye, ArrowRight,
  Type, Image as ImageIcon, Square, Layout, BoxSelect, GripVertical, Copy, Trash2, Box,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { EmailFooter } from "@/components/EmailFooter";

// ─── Types ────────────────────────────────────────────────────────────────────
type DeviceMode = "desktop" | "mobile";
type ViewMode = "edit" | "preview";
type BlockType = "header" | "heading" | "text" | "button" | "image" | "section" | "container";

interface Block {
  id: string;
  type: BlockType;
  content: string;
  color?: string;
  fontSize?: number;
  align?: "left" | "center" | "right";
  url?: string;
  src?: string;
  alt?: string;
}

type DragData = { kind: "new"; blockType: BlockType } | { kind: "move"; blockId: string };

// ─── Palette items ────────────────────────────────────────────────────────────
const PALETTE_ITEMS: { type: BlockType; label: string; icon: React.ElementType }[] = [
  { type: "button",    label: "Button",    icon: Square },
  { type: "heading",   label: "Heading",   icon: Box },
  { type: "text",      label: "Text",      icon: Type },
  { type: "image",     label: "Image",     icon: ImageIcon },
  { type: "section",   label: "Section",   icon: Layout },
  { type: "container", label: "Container", icon: BoxSelect },
];

// ─── Block factory ────────────────────────────────────────────────────────────
let idCounter = 100;
const nextId = () => `b${++idCounter}`;

function createBlock(type: BlockType): Block {
  switch (type) {
    case "heading": return { id: nextId(), type, content: "New heading", color: "#082D48", fontSize: 22, align: "center" };
    case "text": return { id: nextId(), type, content: "New paragraph text. Click to edit.", color: "#5B6B7A", fontSize: 15, align: "center" };
    case "button": return { id: nextId(), type, content: "Button label", color: "#06ADD8", url: "https://nautilus.co", align: "center" };
    case "image": return { id: nextId(), type, content: "", src: "https://images.unsplash.com/photo-1605164599901-db7f68c5a5c5?w=600&q=80", alt: "Placeholder image", align: "center" };
    case "section": return { id: nextId(), type, content: "", color: "#E6EAEF", align: "center" };
    case "container": return { id: nextId(), type, content: "Container — drop content inside", color: "#5B6B7A", align: "center" };
    default: return { id: nextId(), type: "text", content: "New block", color: "#5B6B7A", fontSize: 15, align: "center" };
  }
}

// ─── Default blocks ───────────────────────────────────────────────────────────
const DEFAULT_BLOCKS: Block[] = [
  { id: "b1", type: "header", content: "Nautilus Car Wash", color: "#06ADD8", align: "center" },
  { id: "b2", type: "heading", content: "Welcome aboard!", color: "#082D48", fontSize: 24, align: "center" },
  { id: "b3", type: "text", content: "We're thrilled to have you join the Nautilus family. Get ready for the cleanest car in town. As a welcome gift, your first premium wash is on us.", color: "#5B6B7A", fontSize: 15, align: "center" },
  { id: "b4", type: "button", content: "Claim my free wash", color: "#06ADD8", url: "https://nautilus.co/claim", align: "center" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────
function PaletteChip({ icon: Icon, label, onDragStart, onDragEnd }: {
  icon: React.ElementType; label: string; onDragStart: () => void; onDragEnd: () => void;
}) {
  return (
    <div
      draggable
      onDragStart={(e) => { e.dataTransfer.effectAllowed = "copy"; onDragStart(); }}
      onDragEnd={onDragEnd}
      className="flex items-center gap-2.5 p-2 rounded-md border border-gray-200 bg-gray-50 hover:border-cyan-300 hover:bg-white cursor-grab active:cursor-grabbing transition-colors select-none"
    >
      <Icon className="w-4 h-4 text-gray-400" />
      <span className="text-[13px] font-medium text-gray-700">{label}</span>
    </div>
  );
}

function DropIndicator({ active }: { active: boolean }) {
  if (!active) return null;
  return (
    <div className="relative h-0">
      <div className="absolute -top-0.5 left-0 right-0 h-0.5 bg-cyan-400 rounded-full">
        <div className="absolute -left-1 -top-[3px] w-2 h-2 rounded-full bg-cyan-400" />
        <div className="absolute -right-1 -top-[3px] w-2 h-2 rounded-full bg-cyan-400" />
      </div>
    </div>
  );
}

const INLINE_EDITABLE: BlockType[] = ["header", "heading", "text", "button", "container"];

function EmailBlock({ block, index, isSelected, isEditMode, onSelect, onUpdate, onDragStart, onDragEnd, onDuplicate, onDelete }: {
  block: Block; index: number; isSelected: boolean; isEditMode: boolean;
  onSelect: () => void; onUpdate: (content: string) => void;
  onDragStart: () => void; onDragEnd: () => void;
  onDuplicate: () => void; onDelete: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [isInlineEditing, setIsInlineEditing] = useState(false);
  const alignClass = block.align === "center" ? "text-center mx-auto" : block.align === "right" ? "text-right ml-auto" : "text-left mr-auto";
  const flexAlignClass = block.align === "center" ? "justify-center" : block.align === "right" ? "justify-end" : "justify-start";

  const canInlineEdit = INLINE_EDITABLE.includes(block.type);

  const handleDoubleClick = (e: React.MouseEvent) => {
    if (!isEditMode || !canInlineEdit) return;
    e.stopPropagation();
    setIsInlineEditing(true);
  };

  const handleBlur = (e: React.FocusEvent<HTMLElement>) => {
    onUpdate(e.currentTarget.innerText);
    setIsInlineEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
    if (e.key === "Escape") {
      (e.currentTarget as HTMLElement).blur();
    }
    // Allow Enter for multiline (text block), otherwise blur on Enter
    if (e.key === "Enter" && block.type !== "text") {
      e.preventDefault();
      (e.currentTarget as HTMLElement).blur();
    }
  };

  const editableProps = (extraClass = "") => ({
    contentEditable: isInlineEditing,
    suppressContentEditableWarning: true,
    onBlur: handleBlur,
    onKeyDown: handleKeyDown,
    className: `outline-none ${isInlineEditing ? "cursor-text ring-2 ring-cyan-400 ring-offset-1 rounded-sm" : ""} ${extraClass}`,
  });

  return (
    <div
      data-block-index={index}
      className={`relative email-block ${isEditMode ? "cursor-pointer" : ""} ${dragging ? "opacity-40" : ""}`}
      onClick={(e) => { e.stopPropagation(); onSelect(); }}
      onDoubleClick={handleDoubleClick}
    >
      {isEditMode && isSelected && !isInlineEditing && (
        <>
          <div className="absolute inset-0 border-[1.5px] border-cyan-400 z-10 pointer-events-none" />
          <div className="absolute -top-8 right-0 bg-cyan-400 text-white rounded-t-md flex items-center shadow-sm z-20">
            <button
              draggable
              onDragStart={(e) => { e.dataTransfer.effectAllowed = "move"; setDragging(true); onDragStart(); }}
              onDragEnd={() => { setDragging(false); onDragEnd(); }}
              className="p-1.5 hover:bg-cyan-500 transition-colors cursor-grab"
              title="Drag to reorder"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDuplicate(); }} className="p-1.5 hover:bg-cyan-500 transition-colors" title="Duplicate">
              <Copy className="w-3.5 h-3.5" />
            </button>
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-1.5 hover:bg-cyan-500 transition-colors" title="Delete">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </>
      )}

      <div className={`relative z-0 ${isEditMode && !isSelected ? "hover:outline hover:outline-1 hover:outline-cyan-300" : ""}`}>
        {block.type === "header" && (
          <div className="py-6 px-8 flex items-center justify-center" style={{ backgroundColor: block.color }}>
            <span
              {...editableProps("text-white font-semibold text-lg tracking-wide")}
            >
              {block.content}
            </span>
          </div>
        )}
        {block.type === "heading" && (
          <div className="py-6 px-8">
            <h1
              {...editableProps(`font-semibold ${alignClass}`)}
              style={{ color: block.color, fontSize: `${block.fontSize}px` }}
            >
              {block.content}
            </h1>
          </div>
        )}
        {block.type === "text" && (
          <div className="py-2 px-8">
            <p
              {...editableProps(`${alignClass} leading-relaxed`)}
              style={{ color: block.color, fontSize: `${block.fontSize}px` }}
            >
              {block.content}
            </p>
          </div>
        )}
        {block.type === "button" && (
          <div className={`py-8 px-8 flex ${flexAlignClass}`}>
            <span
              {...editableProps("inline-block px-6 py-3 rounded-md font-medium text-[15px] text-white")}
              style={{ backgroundColor: block.color }}
            >
              {block.content}
            </span>
          </div>
        )}
        {block.type === "image" && (
          <div className="px-8 py-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={block.src} alt={block.alt || ""} className="w-full h-auto rounded-md object-cover" />
          </div>
        )}
        {block.type === "section" && (
          <div className="px-8 py-6">
            <div className="w-full h-px" style={{ backgroundColor: block.color }} />
          </div>
        )}
        {block.type === "container" && (
          <div className="px-8 py-4">
            <div className="border border-dashed border-gray-300 rounded-md px-6 py-8 text-center">
              <span
                {...editableProps("text-[14px]")}
                style={{ color: block.color }}
              >
                {block.content}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main builder ─────────────────────────────────────────────────────────────
export function EmailBuilderClient({ template }: { template?: string }) {
  const router = useRouter();
  const isCustom = template === "custom";

  const [deviceMode, setDeviceMode] = useState<DeviceMode>("desktop");
  const [viewMode, setViewMode] = useState<ViewMode>("edit");
  const [blocks, setBlocks] = useState<Block[]>(isCustom ? [] : DEFAULT_BLOCKS);
  const [selectedId, setSelectedId] = useState<string | null>(isCustom ? null : "b2");

  const dragData = useRef<DragData | null>(null);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  const selectedBlock = blocks.find((b) => b.id === selectedId);

  const updateSelected = (updates: Partial<Block>) => {
    if (!selectedId) return;
    setBlocks(blocks.map((b) => b.id === selectedId ? { ...b, ...updates } : b));
  };

  const duplicateBlock = (id: string) => {
    const idx = blocks.findIndex((b) => b.id === id);
    if (idx === -1) return;
    const copy = { ...blocks[idx], id: nextId() };
    const next = [...blocks];
    next.splice(idx + 1, 0, copy);
    setBlocks(next);
    setSelectedId(copy.id);
  };

  const deleteBlock = (id: string) => {
    setBlocks(blocks.filter((b) => b.id !== id));
    if (selectedId === id) setSelectedId(null);
  };

  const computeDropIndex = (e: React.DragEvent, sheet: HTMLElement) => {
    const els = Array.from(sheet.querySelectorAll<HTMLElement>("[data-block-index]"));
    for (let i = 0; i < els.length; i++) {
      const rect = els[i].getBoundingClientRect();
      if (e.clientY < rect.top + rect.height / 2) return i;
    }
    return els.length;
  };

  const handleSheetDragOver = (e: React.DragEvent) => {
    if (!dragData.current) return;
    e.preventDefault();
    setIsDraggingOver(true);
    setDropIndex(computeDropIndex(e, e.currentTarget as HTMLElement));
  };

  const handleSheetDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const data = dragData.current;
    if (!data) return;
    const targetIndex = dropIndex ?? blocks.length;
    if (data.kind === "new") {
      const block = createBlock(data.blockType);
      const next = [...blocks];
      next.splice(targetIndex, 0, block);
      setBlocks(next);
      setSelectedId(block.id);
    } else {
      const fromIndex = blocks.findIndex((b) => b.id === data.blockId);
      if (fromIndex !== -1) {
        const next = [...blocks];
        const [moved] = next.splice(fromIndex, 1);
        const adjusted = fromIndex < targetIndex ? targetIndex - 1 : targetIndex;
        next.splice(adjusted, 0, moved);
        setBlocks(next);
        setSelectedId(moved.id);
      }
    }
    dragData.current = null;
    setIsDraggingOver(false);
    setDropIndex(null);
  };

  const sheetWidth = deviceMode === "desktop" ? "w-full max-w-[600px]" : "w-full max-w-[360px]";

  return (
    <div className="flex flex-col h-full">
      {/* Internal toolbar */}
      <div className="h-14 border-b border-gray-200 flex items-center justify-between px-4 bg-white flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[15px] font-medium text-gray-900">
            {isCustom ? "Custom template" : "Welcome message"}
          </span>
          <Badge variant="secondary" className="text-[11px] uppercase tracking-wider">Draft</Badge>
        </div>

        <div className="flex items-center gap-4">
          {/* Undo / Redo */}
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" disabled className="h-8 w-8 text-gray-300">
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="icon" disabled className="h-8 w-8 text-gray-300">
              <Redo2 className="w-4 h-4" />
            </Button>
          </div>

          {/* Device toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            {([["desktop", Monitor], ["mobile", Smartphone]] as const).map(([mode, Icon]) => (
              <button
                key={mode}
                onClick={() => setDeviceMode(mode)}
                className={`p-1.5 rounded-md transition-colors ${deviceMode === mode ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
              >
                <Icon className="w-4 h-4" />
              </button>
            ))}
          </div>

          {/* Edit / Preview toggle */}
          <div className="flex items-center bg-gray-100 p-0.5 rounded-lg border border-gray-200">
            <button
              onClick={() => setViewMode("edit")}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5 ${viewMode === "edit" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
            >
              <Pencil className="w-3.5 h-3.5" /> Edit
            </button>
            <button
              onClick={() => { setViewMode("preview"); setSelectedId(null); }}
              className={`px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors flex items-center gap-1.5 ${viewMode === "preview" ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
          </div>

          <Button
            size="sm"
            className="bg-cyan-400 hover:bg-cyan-500 text-white gap-1.5"
            onClick={() => {
              localStorage.setItem("email-draft-blocks", JSON.stringify(blocks));
              router.push(`/email/builder/send?template=${template ?? ""}`);
            }}
          >
            Continue to send <ArrowRight className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>

      {/* Three-pane layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left palette */}
        {viewMode === "edit" && (
          <div className="w-[180px] flex-shrink-0 border-r border-gray-200 bg-white flex flex-col overflow-y-auto p-4">
            <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 mb-3">Components</p>
            <div className="space-y-2 mb-8">
              {PALETTE_ITEMS.map((item) => (
                <PaletteChip
                  key={item.type}
                  icon={item.icon}
                  label={item.label}
                  onDragStart={() => { dragData.current = { kind: "new", blockType: item.type }; }}
                  onDragEnd={() => { dragData.current = null; setIsDraggingOver(false); setDropIndex(null); }}
                />
              ))}
            </div>

            <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 mb-3">Templates</p>
            <div className="space-y-2">
              {["Welcome", "Newsletter", "Promo"].map((t) => (
                <div key={t} className="flex items-center justify-center p-2 rounded-md border border-dashed border-gray-200 bg-gray-50 hover:border-cyan-300 hover:bg-white cursor-pointer transition-colors">
                  <span className="text-[13px] font-medium text-gray-500">{t}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Center canvas */}
        <div
          className="flex-1 bg-gray-100 overflow-y-auto p-8 flex justify-center"
          onClick={(e) => { if (!(e.target as HTMLElement).closest(".email-block")) setSelectedId(null); }}
        >
          <div
            className={`bg-white shadow-sm min-h-[400px] transition-all duration-300 relative ${sheetWidth} ${viewMode === "edit" && isDraggingOver ? "ring-1 ring-cyan-400/40" : ""}`}
            onDragOver={viewMode === "edit" ? handleSheetDragOver : undefined}
            onDragLeave={() => { setIsDraggingOver(false); setDropIndex(null); }}
            onDrop={viewMode === "edit" ? handleSheetDrop : undefined}
          >
            {blocks.length === 0 ? (
              <div className={`absolute inset-4 border-2 border-dashed rounded-lg flex items-center justify-center transition-colors ${isDraggingOver ? "border-cyan-400 bg-cyan-50" : "border-cyan-300/50 bg-cyan-50/30"}`}>
                <span className="text-cyan-500 font-medium text-[14px]">Drag a component here</span>
              </div>
            ) : (
              <div className="flex flex-col">
                <DropIndicator active={isDraggingOver && dropIndex === 0} />
                {blocks.map((block, index) => (
                  <Fragment key={block.id}>
                    <EmailBlock
                      block={block}
                      index={index}
                      isSelected={selectedId === block.id}
                      isEditMode={viewMode === "edit"}
                      onSelect={() => viewMode === "edit" && setSelectedId(block.id)}
                      onUpdate={(content) => setBlocks(prev => prev.map(b => b.id === block.id ? { ...b, content } : b))}
                      onDragStart={() => { dragData.current = { kind: "move", blockId: block.id }; }}
                      onDragEnd={() => { dragData.current = null; setIsDraggingOver(false); setDropIndex(null); }}
                      onDuplicate={() => duplicateBlock(block.id)}
                      onDelete={() => deleteBlock(block.id)}
                    />
                    <DropIndicator active={isDraggingOver && dropIndex === index + 1} />
                  </Fragment>
                ))}
              </div>
            )}
            {blocks.length > 0 && <EmailFooter />}
          </div>
        </div>

        {/* Right property panel */}
        {viewMode === "edit" && (
          <div className="w-[260px] flex-shrink-0 border-l border-gray-200 bg-white flex flex-col overflow-y-auto">
            {selectedBlock ? (
              <div className="p-4 flex flex-col gap-5">
                <p className="text-[11px] font-semibold tracking-wider uppercase text-gray-400 border-b border-gray-100 pb-2">
                  {selectedBlock.type} properties
                </p>

                {selectedBlock.type === "image" ? (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Image URL</Label>
                      <Input value={selectedBlock.src || ""} onChange={(e) => updateSelected({ src: e.target.value })} className="h-8 text-[13px]" />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Alt text</Label>
                      <Input value={selectedBlock.alt || ""} onChange={(e) => updateSelected({ alt: e.target.value })} className="h-8 text-[13px]" />
                    </div>
                  </>
                ) : (
                  <>
                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Content</Label>
                      {selectedBlock.type === "text" ? (
                        <Textarea value={selectedBlock.content} onChange={(e) => updateSelected({ content: e.target.value })} className="text-[13px] min-h-[80px] resize-y" />
                      ) : (
                        <Input value={selectedBlock.content} onChange={(e) => updateSelected({ content: e.target.value })} className="h-8 text-[13px]" />
                      )}
                    </div>

                    {selectedBlock.type === "button" && (
                      <div className="space-y-1.5">
                        <Label className="text-[13px]">Link URL</Label>
                        <Input value={selectedBlock.url || ""} onChange={(e) => updateSelected({ url: e.target.value })} className="h-8 text-[13px]" />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <Label className="text-[13px]">Color</Label>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-md border border-gray-200 flex-shrink-0" style={{ backgroundColor: selectedBlock.color }} />
                        <Input value={selectedBlock.color || ""} onChange={(e) => updateSelected({ color: e.target.value })} className="h-8 text-[13px] font-mono uppercase" />
                      </div>
                    </div>

                    {(selectedBlock.type === "heading" || selectedBlock.type === "text") && (
                      <>
                        <Separator />
                        <div className="space-y-1.5">
                          <Label className="text-[13px]">Font size (px)</Label>
                          <Input
                            type="number"
                            value={selectedBlock.fontSize || 14}
                            onChange={(e) => updateSelected({ fontSize: parseInt(e.target.value) || 14 })}
                            className="h-8 text-[13px]"
                          />
                        </div>
                        <div className="space-y-1.5">
                          <Label className="text-[13px]">Alignment</Label>
                          <div className="flex bg-gray-100 p-0.5 rounded-lg border border-gray-200">
                            {(["left", "center", "right"] as const).map((align) => (
                              <button
                                key={align}
                                onClick={() => updateSelected({ align })}
                                className={`flex-1 py-1 text-[12px] font-medium rounded-md capitalize transition-colors ${selectedBlock.align === align ? "bg-white shadow-sm text-gray-900" : "text-gray-400 hover:text-gray-700"}`}
                              >
                                {align}
                              </button>
                            ))}
                          </div>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center p-6 text-center">
                <p className="text-[13px] text-gray-400">
                  Drag a component from the left, or select one on the canvas to edit its properties.
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
