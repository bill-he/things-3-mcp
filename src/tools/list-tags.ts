import { ListTagsSchema, ListTagsInput } from '../types.js';
import { getTags } from '../database.js';

export const listTagsTool = {
  name: 'list_tags',
  description: 'List all tags from Things3. Returns tag names that can be used when creating or updating todos.',
  inputSchema: {
    type: 'object',
    properties: {}
  }
};

export async function handleListTags(params: ListTagsInput): Promise<string> {
  const validated = ListTagsSchema.parse(params);
  const tags = getTags();

  const tagList = tags.map(tag => ({
    id: tag.uuid,
    title: tag.title
  }));

  return JSON.stringify({
    success: true,
    count: tagList.length,
    tags: tagList
  }, null, 2);
}
