import type { ChatMessage } from '../../shared/messages';

export interface SiteAdapter {
  host: string;
  getMessages(): ChatMessage[];
  isAssistantNode(node: Node): boolean;
  findTurnIndex(node: Node): number | null;
}
