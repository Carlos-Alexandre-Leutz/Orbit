import { Role } from '@prisma/client';
import { Tool } from './tool';

/** Every tool the agents may use, by name. */
export class ToolRegistry {
  private readonly tools = new Map<string, Tool>();

  constructor(tools: Tool[] = []) {
    tools.forEach((tool) => this.register(tool));
  }

  register(tool: Tool) {
    if (this.tools.has(tool.name)) {
      throw new Error(`The tool ${tool.name} is already registered`);
    }
    if (tool.requiresApproval && !tool.sideEffect) {
      throw new Error(
        `${tool.name}: only a tool with a side effect needs approval`,
      );
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /** The tools a role may call, with what the model needs to choose one. */
  listFor(role: Role) {
    return [...this.tools.values()]
      .filter((tool) => tool.roles.includes(role))
      .map(({ name, description, inputSchema }) => ({
        name,
        description,
        inputSchema,
      }));
  }
}
