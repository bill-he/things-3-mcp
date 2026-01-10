import { ListProjectsSchema, ListProjectsInput } from '../types.js';
import { getProjectsAndAreas } from '../database.js';

export const listProjectsTool = {
  name: 'list_projects',
  description: 'List all projects and optionally areas from Things3. Returns UUIDs and titles that can be used when creating or updating todos.',
  inputSchema: {
    type: 'object',
    properties: {
      includeAreas: {
        type: 'boolean',
        description: 'Include areas in the results',
        default: true
      }
    }
  }
};

export async function handleListProjects(params: ListProjectsInput): Promise<string> {
  const validated = ListProjectsSchema.parse(params);
  const projectsAndAreas = getProjectsAndAreas(validated.includeAreas ?? true);

  const items = projectsAndAreas.map(item => ({
    id: item.uuid,
    title: item.title,
    type: item.type
  }));

  return JSON.stringify({
    success: true,
    count: items.length,
    items
  }, null, 2);
}
