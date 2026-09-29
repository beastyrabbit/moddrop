import { BaseBoxShapeTool } from "tldraw";

export class AudioPlayerTool extends BaseBoxShapeTool {
  static override readonly id = "audio-player";
  static override readonly initial = "idle";
  override shapeType = "audio-player" as const;
}
