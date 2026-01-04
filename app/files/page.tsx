'use client';

import { useEffect, useState, useRef } from 'react';
import Layout from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  IconButton,
  LinearProgress,
  Chip,
  CircularProgress,
  TextField,
  Stack,
  Menu,
  MenuItem,
  Checkbox,
  FormControlLabel,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';
import PictureAsPdfIcon from '@mui/icons-material/PictureAsPdf';
import ImageIcon from '@mui/icons-material/Image';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import DescriptionIcon from '@mui/icons-material/Description';
import TextSnippetIcon from '@mui/icons-material/TextSnippet';
import FilterListIcon from '@mui/icons-material/FilterList';
import ViewColumnIcon from '@mui/icons-material/ViewColumn';
import SearchIcon from '@mui/icons-material/Search';

export default function FilesPage() {
  const { isAuthenticated, token, hasPermission } = useAuth();
  const [files, setFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewMime, setPreviewMime] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: number; name: string } | null>(null);
  const [operationError, setOperationError] = useState<string | null>(null);
  const [operationSuccess, setOperationSuccess] = useState<string | null>(null);

  // Edit metadata dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingFile, setEditingFile] = useState<any | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editTags, setEditTags] = useState<string[]>([]);
  const [editTagsInput, setEditTagsInput] = useState('');
  const [tagOptions, setTagOptions] = useState<string[]>([]);

  const addTagFromInput = (value?: string) => {
    const v = (value !== undefined ? value : editTagsInput || '').trim();
    if (!v) return;
    setEditTags(prev => (prev.includes(v) ? prev : [...prev, v]));
    setEditTagsInput('');
  };
  const [editFileType, setEditFileType] = useState('');
  const [editNotes, setEditNotes] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Upload queue
  interface PendingUpload {
    id: number;
    file: File;
    name: string;
    size: number;
    progress: number; // 0-100
    status: 'pending' | 'uploading' | 'done' | 'error' | 'canceled';
    error?: string | null;
  }
  const [pendingUploads, setPendingUploads] = useState<PendingUpload[]>([]);
  const xhrMap = {} as Record<number, XMLHttpRequest | undefined>;

  // Search and filter state
  const [searchTerm, setSearchTerm] = useState('');
  const [tagFilter, setTagFilter] = useState<string[]>([]);
  const [fileTypeFilter, setFileTypeFilter] = useState('');

  // Column visibility
  const defaultColumns = {
    description: true,
    tags: true,
    fileType: true,
    notes: true,
    size: true,
    creator: true,
    date: true,
  } as const;
  const [columnsVisible, setColumnsVisible] = useState<Record<string, boolean>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('files_columns') : null;
      return raw ? JSON.parse(raw) : defaultColumns;
    } catch (e) {
      return defaultColumns;
    }
  });
  const [columnsAnchorEl, setColumnsAnchorEl] = useState<HTMLElement | null>(null);
  const columnsOpen = Boolean(columnsAnchorEl);
  const openColumnsMenu = (e: React.MouseEvent<HTMLElement>) => setColumnsAnchorEl(e.currentTarget);
  const closeColumnsMenu = () => setColumnsAnchorEl(null);
  const toggleColumn = (key: string) => {
    setColumnsVisible(prev => {
      const next = { ...prev, [key]: !prev[key] };
      try { localStorage.setItem('files_columns', JSON.stringify(next)); } catch (e) {}
      return next;
    });
  };

  // Resizable columns (generalized)
  const MIN_COL_WIDTH = 80;
  const DEFAULT_COL_WIDTHS = {
    description: 240,
    tags: 180,
    fileType: 100,
    notes: 200,
    size: 120,
    creator: 160,
    date: 160,
  } as const;

  const [colWidths, setColWidths] = useState<Record<string, number>>(() => {
    try {
      const raw = typeof window !== 'undefined' ? localStorage.getItem('files_col_widths') : null;
      return raw ? JSON.parse(raw) : { ...DEFAULT_COL_WIDTHS };
    } catch (e) {
      return { ...DEFAULT_COL_WIDTHS };
    }
  });

  const startRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const onResize = (ev: MouseEvent) => {
    if (!startRef.current) return;
    const dx = ev.clientX - startRef.current.startX;
    const next = Math.max(MIN_COL_WIDTH, Math.round(startRef.current.startWidth + dx));
    setColWidths(prev => ({ ...prev, [startRef.current!.col]: next }));
  };

  const onStopResize = () => {
    startRef.current = null;
    document.removeEventListener('mousemove', onResize);
    document.removeEventListener('mouseup', onStopResize);
  };

  const onStartResize = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    startRef.current = { col, startX: e.clientX, startWidth: colWidths[col] ?? (DEFAULT_COL_WIDTHS as any)[col] ?? 200 };
    document.addEventListener('mousemove', onResize);
    document.addEventListener('mouseup', onStopResize);
  };

  const onHandleKeyDown = (col: string, e: React.KeyboardEvent) => {
    if (['ArrowLeft','ArrowRight','PageUp','PageDown','Home','End'].includes(e.key)) {
      e.preventDefault();
      const step = e.shiftKey ? 50 : 10;
      if (e.key === 'ArrowLeft' || e.key === 'PageDown') {
        setColWidths(prev => ({ ...prev, [col]: Math.max(MIN_COL_WIDTH, (prev[col] ?? (DEFAULT_COL_WIDTHS as any)[col]) - step) }));
      } else if (e.key === 'ArrowRight' || e.key === 'PageUp') {
        setColWidths(prev => ({ ...prev, [col]: (prev[col] ?? (DEFAULT_COL_WIDTHS as any)[col]) + step }));
      } else if (e.key === 'Home') {
        setColWidths(prev => ({ ...prev, [col]: MIN_COL_WIDTH }));
      } else if (e.key === 'End') {
        const max = Math.max(MIN_COL_WIDTH, (typeof window !== 'undefined' ? Math.round(window.innerWidth / 3) : 800));
        setColWidths(prev => ({ ...prev, [col]: max }));
      }
    }
  };

  useEffect(() => {
    try { localStorage.setItem('files_col_widths', JSON.stringify(colWidths)); } catch (e) {}
  }, [colWidths]);

  const loadTagOptions = async () => {
    try {
      const res = await fetch('/api/files/tags');
      const d = await res.json();
      if (d.success) setTagOptions(d.data || []);
    } catch (e) {
      console.error('Failed to load tag options', e);
    }
  };

  // File icon helper
  const getIconForFilename = (name: string) => {
    const ext = (name || '').split('.').pop()?.toLowerCase() || '';
    if (['pdf'].includes(ext)) return <PictureAsPdfIcon color="error" />;
    if (['jpg','jpeg','png','gif','bmp','webp'].includes(ext)) return <ImageIcon color="primary" />;
    if (['doc','docx','odt'].includes(ext)) return <DescriptionIcon color="primary" />;
    if (['txt','md','csv','log'].includes(ext)) return <TextSnippetIcon color="action" />;
    if (['xls','xlsx','csv'].includes(ext)) return <InsertDriveFileIcon color="success" />;
    return <InsertDriveFileIcon />;
  };

  // Truncate helper: show up to `len` characters, otherwise append ellipsis
  const truncate = (s: string, len = 35) => {
    if (!s) return '';
    return s.length > len ? s.slice(0, len) + '…' : s;
  };


  // Filtered files (client-side)
  const filteredFiles = files.filter((f) => {
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      const matches = (f.originalName || '').toLowerCase().includes(s) || (f.description || '').toLowerCase().includes(s) || (f.notes || '').toLowerCase().includes(s);
      if (!matches) return false;
    }
    if (tagFilter && tagFilter.length > 0) {
      const tags = Array.isArray(f.tags) ? f.tags.map((t: string) => t.toLowerCase()) : [];
      const ok = tagFilter.every(t => tags.includes(t.toLowerCase()));
      if (!ok) return false;
    }
    if (fileTypeFilter) {
      if (!((f.fileType || '').toLowerCase().includes(fileTypeFilter.toLowerCase()))) return false;
    }
    return true;
  });

  useEffect(() => {
    if (!isAuthenticated) return;
    fetchFiles();
    loadTagOptions();

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/files', {
        headers: token ? { Authorization: `Bearer ${token}` } : undefined,
      });
      const data = await response.json();
      if (data.success) {
        setFiles(data.data.data || []);
      } else {
        console.error('Error fetching files:', data.error);
      }
    } catch (err) {
      console.error('Error fetching files', err);
    } finally {
      setLoading(false);
    }
  };

  const onDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    const items = Array.from(e.dataTransfer.files || []);
    const newPending = items.map((f, idx) => ({
      id: Date.now() + idx,
      file: f,
      name: f.name,
      size: f.size,
      progress: 0,
      status: 'pending' as const,
      error: null,
    }));
    setPendingUploads(prev => [...prev, ...newPending]);
  };

  // Legacy immediate upload (kept for compatibility but not used by drag-drop queue)
  const uploadFile = async (file: File) => {
    startUpload({ id: Date.now(), file, name: file.name, size: file.size, progress: 0, status: 'pending' });
  };

  const startUpload = (uploadItem: { id: number; file: File; name: string; size: number; progress: number; status: string; }) => {
    if (!hasPermission('files.upload')) {
      alert('Bạn không có quyền tải lên');
      return;
    }

    // Insert into pendingUploads if not present
    setPendingUploads(prev => {
      if (prev.find(p => p.id === uploadItem.id)) return prev;
      return [...prev, { ...uploadItem, status: 'pending' } as any];
    });

    // Read file to DataURL and send via XHR to get progress
    const reader = new FileReader();
    reader.onload = function () {
      const result = reader.result as string;

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/files');
      if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`);
      xhr.setRequestHeader('Content-Type', 'application/json');

      xhr.upload.onprogress = function (e) {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded / e.total) * 100);
          setPendingUploads(prev => prev.map(p => p.id === uploadItem.id ? { ...p, progress: percent, status: 'uploading' } : p));
        }
      };

      xhr.onload = function () {
        if (xhr.status >= 200 && xhr.status < 300) {
          setPendingUploads(prev => prev.map(p => p.id === uploadItem.id ? { ...p, progress: 100, status: 'done' } : p));
          fetchFiles();
          // remove after short delay
          setTimeout(() => setPendingUploads(prev => prev.filter(p => p.id !== uploadItem.id)), 1000);
        } else {
          let msg = 'Upload failed';
          try {
            msg = JSON.parse(xhr.responseText).error || msg;
          } catch (e) {}
          setPendingUploads(prev => prev.map(p => p.id === uploadItem.id ? { ...p, status: 'error', error: msg } : p));
        }
        delete xhrMap[uploadItem.id];
      };

      xhr.onerror = function () {
        setPendingUploads(prev => prev.map(p => p.id === uploadItem.id ? { ...p, status: 'error', error: 'Network error' } : p));
        delete xhrMap[uploadItem.id];
      };

      xhr.send(JSON.stringify({ originalName: uploadItem.name, content: result, mimeType: uploadItem.file.type }));
      xhrMap[uploadItem.id] = xhr;
    };
    reader.readAsDataURL(uploadItem.file);
  };

  const cancelUpload = (id: number) => {
    const xhr = xhrMap[id];
    if (xhr) {
      xhr.abort();
      delete xhrMap[id];
      setPendingUploads(prev => prev.map(p => p.id === id ? { ...p, status: 'canceled', error: 'Aborted' } : p));
    } else {
      setPendingUploads(prev => prev.filter(p => p.id !== id));
    }
  };

  function formatSize(bytes: number | null | undefined) {
    if (!bytes && bytes !== 0) return '';
    const b = Number(bytes);
    if (b >= 1024 * 1024) return (b / (1024 * 1024)).toFixed(2) + ' MB';
    if (b >= 1024) return (b / 1024).toFixed(1) + ' KB';
    return b + ' B';
  }

  const uploadAll = () => {
    if (!hasPermission('files.upload')) {
      alert('Bạn không có quyền tải lên');
      return;
    }
    pendingUploads.forEach(p => {
      if (p.status === 'pending' || p.status === 'error') startUpload(p as any);
    });
  };

  const retryUpload = (id: number) => {
    const p = pendingUploads.find(x => x.id === id);
    if (!p) return;
    // reset status and restart
    setPendingUploads(prev => prev.map(x => x.id === id ? { ...x, status: 'pending', error: null, progress: 0 } : x));
    startUpload(p as any);
  };

  const openPreview = async (id: number) => {
    const response = await fetch(`/api/files/${id}/preview`, {
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    if (!response.ok) {
      const err = await response.json().catch(() => null);
      alert(err?.error || 'Không thể xem file');
      return;
    }
    const blob = await response.blob();
    const url = URL.createObjectURL(blob);
    setPreviewMime(response.headers.get('content-type'));
    setPreviewUrl(url);
  };

  const download = async (id: number) => {
    // Use fetch with Authorization header so downloads work when using JWT bearer tokens
    try {
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const resp = await fetch(`/api/files/${id}/download`, { headers, method: 'GET', credentials: 'same-origin', cache: 'no-store' });
      if (!resp.ok) {
        const err = await resp.json().catch(() => null);
        alert(err?.error || 'Không thể tải file');
        return;
      }

      const blob = await resp.blob();

      // Try to get filename from Content-Disposition header
      const cd = resp.headers.get('content-disposition') || '';
      let filename = '';
      const m = /filename="?([^";]+)"?/.exec(cd);
      if (m && m[1]) filename = m[1];
      // fallback: find filename from files list
      if (!filename) {
        const f = files.find(x => x.id === id);
        filename = f?.originalName || `file-${id}`;
      }

      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Download error', err);
      if (!navigator.onLine) {
        alert('Không có kết nối mạng. Vui lòng kiểm tra kết nối.');
      } else {
        const fallback = token ? confirm('Tải thất bại. Mở link tải trực tiếp trong tab mới?') : false;
        if (fallback && token) {
          window.open(`/api/files/${id}/download?token=${encodeURIComponent(token)}`, '_blank');
        } else {
          alert(err?.message || 'Lỗi tải file (Failed to fetch). Mở console để xem chi tiết.');
        }
      }
    }
  };

  const openEdit = (file: any) => {
    setEditingFile(file);
    setEditDescription(file.description || '');
    setEditTags(Array.isArray(file.tags) ? file.tags : (typeof file.tags === 'string' ? [file.tags] : []));
    setEditFileType(file.fileType || '');
    setEditNotes(file.notes || '');
    setEditDialogOpen(true);
  };

  const saveEdit = async () => {
    if (!editingFile) return;
    setSavingEdit(true);
    try {
      const body = {
        description: editDescription,
        tags: editTags,
        fileType: editFileType,
        notes: editNotes,
      } as any;

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const response = await fetch(`/api/files/${editingFile.id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify(body),
      });
      const data = await response.json();
      if (!data.success) throw new Error(data.error || 'Lỗi cập nhật');
      setEditDialogOpen(false);
      setEditingFile(null);
      await fetchFiles();
      // refresh tag options to include newly added tags
      await loadTagOptions();
    } catch (err: any) {
      alert(err.message || 'Lỗi cập nhật');
    } finally {
      setSavingEdit(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <Box sx={{ p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 2, mb: 2 }}>
          <Typography variant="h4">File Lưu trữ</Typography>
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              size="small"
              placeholder="Tìm theo tên, mô tả, ghi chú..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              InputProps={{ startAdornment: (<InputAdornment position="start"><SearchIcon /></InputAdornment>) }}
            />
            <Autocomplete
              multiple
              size="small"
              options={tagOptions}
              value={tagFilter}
              onChange={(e, v) => setTagFilter(v as string[])}
              renderInput={(params) => <TextField {...params} placeholder="Lọc theo tag" />}
              sx={{ width: 220 }}
            />
            <TextField size="small" placeholder="Lọc theo loại" value={fileTypeFilter} onChange={(e) => setFileTypeFilter(e.target.value)} />
            <Tooltip title="Columns">
              <IconButton size="small" onClick={openColumnsMenu}>
                <ViewColumnIcon />
              </IconButton>
            </Tooltip>
            <Menu anchorEl={columnsAnchorEl} open={columnsOpen} onClose={closeColumnsMenu}>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.description} onChange={() => toggleColumn('description')} />} label="Mô tả" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.tags} onChange={() => toggleColumn('tags')} />} label="Tags" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.fileType} onChange={() => toggleColumn('fileType')} />} label="Loại" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.notes} onChange={() => toggleColumn('notes')} />} label="Ghi chú" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.size} onChange={() => toggleColumn('size')} />} label="Kích thước" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.creator} onChange={() => toggleColumn('creator')} />} label="Người tạo" />
              </MenuItem>
              <MenuItem>
                <FormControlLabel control={<Checkbox checked={!!columnsVisible.date} onChange={() => toggleColumn('date')} />} label="Ngày tạo" />
              </MenuItem>
            </Menu>
          </Box>
        </Box>

        <Paper
          onDrop={onDrop}
          onDragOver={(e) => e.preventDefault()}
          sx={{ p: 4, mb: 3, textAlign: 'center', border: '2px dashed', cursor: 'pointer' }}
        >
          <UploadFileIcon sx={{ fontSize: 48 }} />
          <Typography>Thả file vào đây để tải lên hoặc kéo và thả</Typography>
        </Paper>

        {/* Pending uploads */}
        {pendingUploads.length > 0 && (
          <Paper sx={{ mb: 3, p: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
              <Typography variant="subtitle1">Hàng đợi upload</Typography>
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                {pendingUploads.some(p => p.status === 'uploading') && (
                  <Chip icon={<CircularProgress size={14} />} label="Đang tải nền" />
                )}
                {hasPermission('files.upload') && (
                  <Button variant="contained" onClick={uploadAll}>Upload All</Button>
                )}
              </Box>
            </Box>

            {pendingUploads.map(p => (
              <Box key={p.id} sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Box sx={{ flex: 1 }}>
                  <Tooltip title={p.name || ''} arrow>
                    <Typography sx={{ fontWeight: 500 }}>{truncate(p.name || '', 35)} <Typography component="span" sx={{ color: 'text.secondary' }}>({(p.size / 1024).toFixed(1)} KB)</Typography></Typography>
                  </Tooltip>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <Box sx={{ flex: 1 }}>
                      <LinearProgress variant="determinate" value={p.progress} sx={{ mt: 1 }} />
                      {p.status === 'error' && <Typography color="error" sx={{ mt: 1 }}>{p.error}</Typography>}
                    </Box>
                    <Box sx={{ minWidth: 96, display: 'flex', gap: 1 }}>
                      {p.status === 'pending' && <Button size="small" onClick={() => startUpload(p as any)} variant="contained">Upload</Button>}
                      {p.status === 'uploading' && <Button size="small" onClick={() => cancelUpload(p.id)} variant="outlined">Hủy</Button>}
                      {p.status === 'error' && (
                        <>
                          <Button size="small" onClick={() => retryUpload(p.id)} variant="contained">Retry</Button>
                          <Button size="small" onClick={() => setPendingUploads(prev => prev.filter(x => x.id !== p.id))}>Xóa</Button>
                        </>
                      )}
                      {p.status === 'done' && <Button size="small" onClick={() => setPendingUploads(prev => prev.filter(x => x.id !== p.id))}>Xóa</Button>}
                      {p.status === 'canceled' && <Button size="small" onClick={() => setPendingUploads(prev => prev.filter(x => x.id !== p.id))}>Xóa</Button>}
                    </Box>
                  </Box>
                </Box>
              </Box>
            ))}
          </Paper>
        )}

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Tên file</TableCell>
                {columnsVisible.description && (
                  <TableCell sx={{ width: colWidths.description, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Box component="span">Mô tả</Box>
                        <Typography component="span" variant="caption" sx={{ color: 'text.secondary' }}>{colWidths.description}px</Typography>
                      </Box>
                      <Tooltip title={`${colWidths.description}px`} arrow>
                        <Box
                          onMouseDown={(e) => onStartResize('description', e)}
                          onKeyDown={(e) => onHandleKeyDown('description', e)}
                          tabIndex={0}
                          role="separator"
                          aria-orientation="horizontal"
                          aria-label="Resize description column"
                          aria-valuemin={MIN_COL_WIDTH}
                          aria-valuemax={1000}
                          aria-valuenow={colWidths.description}
                          sx={{ width: 12, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', '&:hover': { backgroundColor: 'action.hover' }, '&:focus': { outline: '2px solid', outlineColor: 'primary.main', backgroundColor: 'action.selected' } }}
                        >
                          <Box component="span" sx={{ width: 4, height: 28, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.tags && (
                  <TableCell sx={{ width: colWidths.tags, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Tags</Box>
                      <Tooltip title={`${colWidths.tags}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('tags', e)} onKeyDown={(e) => onHandleKeyDown('tags', e)} tabIndex={0} role="separator" aria-label="Resize tags column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.tags} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.fileType && (
                  <TableCell sx={{ width: colWidths.fileType, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Loại</Box>
                      <Tooltip title={`${colWidths.fileType}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('fileType', e)} onKeyDown={(e) => onHandleKeyDown('fileType', e)} tabIndex={0} role="separator" aria-label="Resize file type column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.fileType} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.notes && (
                  <TableCell sx={{ width: colWidths.notes, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Ghi chú</Box>
                      <Tooltip title={`${colWidths.notes}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('notes', e)} onKeyDown={(e) => onHandleKeyDown('notes', e)} tabIndex={0} role="separator" aria-label="Resize notes column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.notes} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.size && (
                  <TableCell sx={{ width: colWidths.size, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Kích thước</Box>
                      <Tooltip title={`${colWidths.size}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('size', e)} onKeyDown={(e) => onHandleKeyDown('size', e)} tabIndex={0} role="separator" aria-label="Resize size column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.size} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.creator && (
                  <TableCell sx={{ width: colWidths.creator, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Người tạo</Box>
                      <Tooltip title={`${colWidths.creator}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('creator', e)} onKeyDown={(e) => onHandleKeyDown('creator', e)} tabIndex={0} role="separator" aria-label="Resize creator column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.creator} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                {columnsVisible.date && (
                  <TableCell sx={{ width: colWidths.date, minWidth: MIN_COL_WIDTH, position: 'relative' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box component="span">Ngày tạo</Box>
                      <Tooltip title={`${colWidths.date}px`} arrow>
                        <Box onMouseDown={(e) => onStartResize('date', e)} onKeyDown={(e) => onHandleKeyDown('date', e)} tabIndex={0} role="separator" aria-label="Resize date column" aria-valuemin={MIN_COL_WIDTH} aria-valuenow={colWidths.date} sx={{ width: 10, cursor: 'col-resize', height: '100%', ml: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <Box component="span" sx={{ width: 3, height: 20, backgroundColor: 'grey.400', borderRadius: 1 }} />
                        </Box>
                      </Tooltip>
                    </Box>
                  </TableCell>
                )}
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {filteredFiles.map((f) => (
                <TableRow key={f.id}>
                  <TableCell sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {getIconForFilename(f.originalName)}
                    <Box>
                      <Tooltip title={f.originalName || ''} arrow>
                        <Typography sx={{ fontWeight: 600 }}>{truncate(f.originalName || '', 35)}</Typography>
                      </Tooltip>
                      <Typography variant="caption" sx={{ color: 'text.secondary' }}>{(f.filename || '').split('.').pop()?.toUpperCase() || ''}</Typography>
                    </Box>
                  </TableCell>
                  {columnsVisible.description && <TableCell sx={{ width: colWidths.description, minWidth: MIN_COL_WIDTH, whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.description || ''}</TableCell>}
                  {columnsVisible.tags && <TableCell sx={{ width: colWidths.tags, minWidth: MIN_COL_WIDTH }}>
                    <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                      {(Array.isArray(f.tags) ? f.tags : []).map((t: string) => (
                        <Chip key={t} label={t} size="small" />
                      ))}
                    </Box>
                  </TableCell>}
                  {columnsVisible.fileType && <TableCell sx={{ width: colWidths.fileType, minWidth: MIN_COL_WIDTH }}>{f.fileType || ''}</TableCell>}
                  {columnsVisible.notes && <TableCell sx={{ width: colWidths.notes, minWidth: MIN_COL_WIDTH, whiteSpace: 'normal', wordBreak: 'break-word' }}>{f.notes || ''}</TableCell>}
                  {columnsVisible.size && <TableCell sx={{ width: colWidths.size, minWidth: MIN_COL_WIDTH, textAlign: 'right' }}>{formatSize(f.size)}</TableCell>}
                  {columnsVisible.creator && <TableCell sx={{ width: colWidths.creator, minWidth: MIN_COL_WIDTH }}>{f.createdByName || f.createdBy}</TableCell>}
                  {columnsVisible.date && <TableCell sx={{ width: colWidths.date, minWidth: MIN_COL_WIDTH }}>{new Date(f.createdAt).toLocaleString()}</TableCell>}
                  <TableCell align="right">
                    <IconButton onClick={() => openPreview(f.id)} size="small">
                      <VisibilityIcon />
                    </IconButton>
                    {hasPermission('files.download') && (
                      <IconButton onClick={() => download(f.id)} size="small">
                        <DownloadIcon />
                      </IconButton>
                    )}
                    {hasPermission('files.update') && (
                      <IconButton onClick={() => openEdit(f)} size="small">
                        <EditIcon />
                      </IconButton>
                    )}
                    {hasPermission('files.delete') && (
                      <IconButton onClick={() => setConfirmDelete({ id: f.id, name: f.originalName })} size="small" color="error">
                        <DeleteIcon />
                      </IconButton>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={!!previewUrl} onClose={() => { setPreviewUrl(null); }} fullWidth maxWidth="lg">
          <DialogTitle>Xem file</DialogTitle>
          <DialogContent>
            {previewUrl && previewMime?.startsWith('image/') && (
              <img src={previewUrl} alt="preview" style={{ maxWidth: '100%' }} />
            )}
            {previewUrl && previewMime === 'application/pdf' && (
              <iframe src={previewUrl} style={{ width: '100%', height: '80vh' }} />
            )}
            {previewUrl && previewMime?.startsWith('text/') && (
              <iframe src={previewUrl} style={{ width: '100%', height: '80vh' }} />
            )}
            {/* For other types browsers may handle inline or download */}
          </DialogContent>
        </Dialog>

        {/* Edit metadata dialog */}
        <Dialog open={editDialogOpen} onClose={() => setEditDialogOpen(false)} fullWidth maxWidth="sm">
          <DialogTitle>Chỉnh sửa metadata</DialogTitle>
          <DialogContent>
            <Stack spacing={2} sx={{ mt: 1 }}>
              <TextField label="Mô tả" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} multiline rows={3} fullWidth />
              <Autocomplete
                multiple
                freeSolo
                filterSelectedOptions
                options={tagOptions}
                value={editTags}
                inputValue={editTagsInput}
                onInputChange={(e, v) => setEditTagsInput(v)}
                onChange={(e, v) => setEditTags(v as string[])}
                renderTags={(value: string[], getTagProps) =>
                  value.map((option, index) => {
                    const tagProps = getTagProps({ index });
                    const { key: _k, ...rest } = tagProps as any;
                    return (
                      <Chip key={option} variant="outlined" size="small" label={option} {...rest} />
                    );
                  })
                }
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Tags"
                    placeholder="Thêm tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ',') {
                        e.preventDefault();
                        const val = (params.inputProps?.value as string) || '';
                        const v = val.trim().replace(/,$/, '');
                        if (v) addTagFromInput(v);
                      }
                    }}
                  />
                )}
              />
              <TextField label="Loại" value={editFileType} onChange={(e) => setEditFileType(e.target.value)} fullWidth />
              <TextField label="Ghi chú" value={editNotes} onChange={(e) => setEditNotes(e.target.value)} multiline rows={3} fullWidth />
            </Stack>
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
            <Button onClick={() => setEditDialogOpen(false)}>Hủy</Button>
            <Button variant="contained" onClick={saveEdit} disabled={savingEdit}>{savingEdit ? 'Đang lưu...' : 'Lưu'}</Button>
          </Box>
        </Dialog>

        {/* Delete confirmation dialog */}
        <Dialog open={!!confirmDelete} onClose={() => setConfirmDelete(null)}>
          <DialogContent>
            <Typography>Bạn có chắc muốn xóa file {confirmDelete?.name}?</Typography>
            {operationError && <Typography color="error">{operationError}</Typography>}
            {operationSuccess && <Typography color="success">{operationSuccess}</Typography>}
          </DialogContent>
          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, p: 2 }}>
            <Button onClick={() => setConfirmDelete(null)}>Hủy</Button>
            <Button
              variant="contained"
              color="error"
              onClick={async () => {
                if (!confirmDelete) return;
                try {
                  const response = await fetch(`/api/files/${confirmDelete.id}`, {
                    method: 'DELETE',
                    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                  });
                  const data = await response.json();
                  if (data.success) {
                    setOperationSuccess(data.message || 'Đã xóa file');
                    setOperationError(null);
                    setConfirmDelete(null);
                    fetchFiles();
                  } else {
                    setOperationError(data.error || 'Lỗi xóa file');
                    setOperationSuccess(null);
                  }
                } catch (err: any) {
                  console.error('Delete file error', err);
                  setOperationError(err.message || 'Lỗi xóa file');
                }
              }}
            >
              Xóa
            </Button>
          </Box>
        </Dialog>
      </Box>
    </Layout>
  );
}