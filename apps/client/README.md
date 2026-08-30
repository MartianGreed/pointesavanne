# Client

Angular 22 (SSR) client for the Villa du Cassier Jaune booking platform.

## Passkeys

The connexion page offers sign-in with a passkey, and the customer area
(Mon profil → Clé d'accès) enrolls one for the signed-in account. Both use the
auth API's `/auth/passkeys/*` endpoints and the browser's WebAuthn API.

Passkeys are bound to the origin the browser sees: the API's `BASE_URL`
(origin and RP ID) must match the deployed client origin. For local
development with `ng serve`, set `BASE_URL=http://localhost:4200` in the
monorepo `.env` (see `.env.dist`).

## Development server

To start a local development server, run:

```bash
ng serve
```

Once the server is running, open your browser and navigate to `http://localhost:4200/`. The application will automatically reload whenever you modify any of the source files.

## Code scaffolding

Angular CLI includes powerful code scaffolding tools. To generate a new component, run:

```bash
ng generate component component-name
```

For a complete list of available schematics (such as `components`, `directives`, or `pipes`), run:

```bash
ng generate --help
```

## Building

To build the project run:

```bash
ng build
```

This will compile your project and store the build artifacts in the `dist/` directory. By default, the production build optimizes your application for performance and speed.

## Running unit tests

Pure TypeScript helpers (no DOM) are tested with Bun:

```bash
bun test
```

## Running end-to-end tests

For end-to-end (e2e) testing, run:

```bash
ng e2e
```

Angular CLI does not come with an end-to-end testing framework by default. You can choose one that suits your needs.

## Additional Resources

For more information on using the Angular CLI, including detailed command references, visit the [Angular CLI Overview and Command Reference](https://angular.dev/tools/cli) page.
