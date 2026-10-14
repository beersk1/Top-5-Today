// Demo mode only: a tiny stand-in for Express, just enough for server/routes.ts to run
// inside the browser. vite.config.ts swaps this in for `import ... from 'express'`.

type DemoRequest = {
  params: Record<string, string>;
  query: Record<string, string>;
  body: any;
  get: (header: string) => string | undefined;
};

type DemoResponse = {
  status: (code: number) => DemoResponse;
  json: (data: unknown) => void;
};

type Handler = (req: DemoRequest, res: DemoResponse) => void;

type Route = { method: string; pattern: RegExp; keys: string[]; handler: Handler };

const routes: Route[] = [];

/** Turns '/topics/:topicId/results' into a regex plus the list of :names. */
function compile(path: string) {
  const keys: string[] = [];
  const source = path.replace(/:(\w+)/g, (_, key: string) => {
    keys.push(key);
    return '([^/]+)';
  });
  return { pattern: new RegExp(`^${source}$`), keys };
}

export function Router() {
  const add = (method: string) => (path: string, handler: Handler) => {
    routes.push({ method, handler, ...compile(path) });
  };
  return { get: add('GET'), post: add('POST'), put: add('PUT') };
}

/** Runs the matching route and returns what it would have sent over the network. */
export function handle(
  method: string,
  url: string,
  headers: Record<string, string>,
  body: unknown,
): { status: number; data: unknown } {
  const [path, queryString = ''] = url.split('?');
  for (const route of routes) {
    const match = route.method === method ? route.pattern.exec(path) : null;
    if (!match) continue;

    const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(match[i + 1])]));
    const query = Object.fromEntries(new URLSearchParams(queryString));
    const lowerHeaders = Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), v]));
    const result = { status: 200, data: null as unknown };
    const res: DemoResponse = {
      status: (code) => {
        result.status = code;
        return res;
      },
      json: (data) => {
        result.data = data;
      },
    };
    try {
      route.handler({ params, query, body, get: (name) => lowerHeaders[name.toLowerCase()] }, res);
    } catch (error) {
      const status = (error as { status?: number }).status ?? 500;
      return { status, data: { error: error instanceof Error ? error.message : 'Something went wrong.' } };
    }
    return result;
  }
  return { status: 404, data: { error: 'Not found.' } };
}

export type Request = DemoRequest;
