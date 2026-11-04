# RBAC (FE)

Checklist và luồng đầy đủ: **`CHATVCB_BE/docs/rbac-module.md`**.

- Catalog + nhãn: `GET /permissions` (BE `catalog.ts`)
- FE constants: `src/lib/access.ts` (`P`) — giữ đồng bộ với BE
- Workspace nav: `src/lib/workspaces.ts`
- Refresh quyền sau admin: `src/lib/refreshAccess.ts` + event `chatvcb:user-refreshed`
