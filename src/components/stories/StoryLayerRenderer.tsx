/**
 * Renders a story's structured overlay layers over the rendered story box.
 *
 * Coordinates are NORMALIZED (0..1) to the box, so the same layer data renders
 * identically at any size. Shared by the viewer (Phase 2) and the editor (Phase 3) so
 * "what you edit" exactly matches "what viewers see".
 */
import type { Layer, TextLayer } from '../../lib/stories';

interface Props {
  layers: Layer[];
  /** measured story-box width in px */
  width: number;
  /** measured story-box height in px */
  height: number;
}

export default function StoryLayerRenderer({ layers, width, height }: Props) {
  if (!width || !height || layers.length === 0) return null;
  const ordered = [...layers].sort((a, b) => a.z - b.z);
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {ordered.map((layer) => {
        if (layer.type === 'text') return <TextLayerView key={layer.id} layer={layer} w={width} h={height} />;
        return null; // future sticker types render here
      })}
    </div>
  );
}

function TextLayerView({ layer, w, h }: { layer: TextLayer; w: number; h: number }) {
  const fontSize = Math.max(layer.fontSize * w, 8);
  const hasBg = !!layer.backgroundColor;
  return (
    <div
      style={{
        position: 'absolute',
        left: layer.x * w,
        top: layer.y * h,
        transform: `translate(-50%, -50%) rotate(${layer.rotation}deg) scale(${layer.scale})`,
        transformOrigin: 'center',
        maxWidth: w * 0.92,
        color: layer.color,
        fontFamily: layer.fontFamily,
        fontSize,
        fontWeight: 700,
        lineHeight: 1.2,
        textAlign: layer.align,
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        background: layer.backgroundColor ?? undefined,
        padding: hasBg ? `${fontSize * 0.18}px ${fontSize * 0.4}px` : undefined,
        borderRadius: hasBg ? fontSize * 0.35 : undefined,
        textShadow: hasBg ? undefined : '0 1px 4px rgba(0,0,0,0.4)',
      }}
    >
      {layer.text}
    </div>
  );
}
