import server from '../dist/server/server.js';

export const config = {
  runtime: 'edge',
};

export default async function (request, context) {
  return server.fetch(request, context);
}
