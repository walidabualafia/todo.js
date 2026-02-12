package web

import "embed"

// Assets contains the compiled frontend files (web/dist/).
// In development, this will contain only the placeholder file.
// In production, build the frontend first: cd web && npm run build
//
//go:embed all:dist
var Assets embed.FS
