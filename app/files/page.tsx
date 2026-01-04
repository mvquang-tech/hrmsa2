'use client';

import { useEffect, useState } from 'react';
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
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import EditIcon from '@mui/icons-material/Edit';
import DownloadIcon from '@mui/icons-material/Download';
import VisibilityIcon from '@mui/icons-material/Visibility';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import DeleteIcon from '@mui/icons-material/Delete';

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

  const loadTagOptions = async () => {
    try {
      const res = await fetch('/api/files/tags');
      const d = await res.json();
      if (d.success) setTagOptions(d.data || []);
    } catch (e) {
      console.error('Failed to load tag options', e);
    }
  };

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
        <Typography variant="h4" sx={{ mb: 2 }}>File Lưu trữ</Typography>

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
                  <Typography sx={{ fontWeight: 500 }}>{p.name} <Typography component="span" sx={{ color: 'text.secondary' }}>({(p.size / 1024).toFixed(1)} KB)</Typography></Typography>
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
                <TableCell>Mô tả</TableCell>
                <TableCell>Tags</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Ghi chú</TableCell>
                <TableCell>Kích thước</TableCell>
                <TableCell>Người tạo</TableCell>
                <TableCell>Ngày tạo</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {files.map((f) => (
                <TableRow key={f.id}>
                  <TableCell>{f.originalName}</TableCell>
                <TableCell sx={{ maxWidth: 240, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.description || ''}</TableCell>
                <TableCell>
                  <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                    {(Array.isArray(f.tags) ? f.tags : []).map((t: string) => (
                      <Chip key={t} label={t} size="small" />
                    ))}
                  </Box>
                </TableCell>
                <TableCell>{f.fileType || ''}</TableCell>
                <TableCell sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{f.notes || ''}</TableCell>
                <TableCell>{formatSize(f.size)}</TableCell>
                <TableCell>{f.createdByName || f.createdBy}</TableCell>
                <TableCell>{new Date(f.createdAt).toLocaleString()}</TableCell>
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