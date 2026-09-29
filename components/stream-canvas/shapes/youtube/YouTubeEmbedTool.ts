import { BaseBoxShapeTool } from "tldraw";

export class YouTubeEmbedTool extends BaseBoxShapeTool {
  static override readonly id = "youtube-embed";
  static override readonly initial = "idle";
  override shapeType = "youtube-embed" as const;
}
