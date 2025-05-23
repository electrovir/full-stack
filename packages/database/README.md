# Database package

This package is a tad tricky to use because it includes code that is backend only _and_ code that is expected to be used in the frontend.

-   `index.ts`: (the main export) is intended to only be used on the backend.
-   `frontend.ts`: is intended to be able to be used on the frontend and the backend. This is best imported through `@evir/common` instead of directly from `@evir/database`.
