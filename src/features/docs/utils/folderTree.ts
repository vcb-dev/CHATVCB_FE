import type { DocFolder } from '@/types';

/** Giá trị đại diện "Chưa xếp thư mục" trong TreeSelect (folderId null) */
export const ROOT_FOLDER = '__root__';

export function childFolders(folders: DocFolder[], parentId: string | null) {
  return folders.filter((folder) => folder.parentId === parentId);
}

type TreeNode = { value: string; title: string; children?: TreeNode[] };

/** Dữ liệu cho TreeSelect: gốc "Chưa xếp thư mục" rồi tới cây thư mục */
export function folderTreeData(folders: DocFolder[]): TreeNode[] {
  const build = (parentId: string | null): TreeNode[] =>
    childFolders(folders, parentId).map((folder) => {
      const children = build(folder.id);
      return { value: folder.id, title: folder.name, ...(children.length ? { children } : {}) };
    });
  return [{ value: ROOT_FOLDER, title: 'Chưa xếp thư mục' }, ...build(null)];
}
