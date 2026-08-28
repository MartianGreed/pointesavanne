import { RenderMode, ServerRoute } from '@angular/ssr';

export const serverRoutes: ServerRoute[] = [
  // The marketing home is prerendered (SEO); the app area renders server-side.
  { path: '', renderMode: RenderMode.Prerender },
  { path: '**', renderMode: RenderMode.Server },
];
