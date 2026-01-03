'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Layout } from '@/components/Layout';
import { useAuth } from '@/hooks/useAuth';
import {
  Box,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  Chip,
  Switch,
  FormControlLabel,
  Checkbox,
  FormGroup,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Divider,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SecurityIcon from '@mui/icons-material/Security';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Role {
  id: number;
  name: string;
  code: string;
  description?: string;
  isSystem: boolean;
  isActive: boolean;
}

interface Permission {
  id: number;
  name: string;
  code: string;
  module: string;
  action: string;
  description?: string;
}

export default function RolesPage() {
  const { isAuthenticated, token, isLoading } = useAuth();
  const router = useRouter();
  const [roles, setRoles] = useState<Role[]>([]);
  const [permissions, setPermissions] = useState<Record<string, Permission[]>>({});
  const [open, setOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [selectedRole, setSelectedRole] = useState<Role | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<number[]>([]);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', isActive: true });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    if (token) {
      fetchRoles();
      fetchPermissions();
    }
  }, [isAuthenticated, token, isLoading, router]);

  const fetchRoles = async () => {
    try {
      const response = await fetch('/api/admin/roles', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setRoles(data.data?.data || []);
      }
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  const fetchPermissions = async () => {
    try {
      const response = await fetch('/api/admin/permissions?grouped=true', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setPermissions(data.data || {});
      }
    } catch (err) {
      console.error('Error fetching permissions:', err);
    }
  };

  const fetchRolePermissions = async (roleId: number) => {
    try {
      const response = await fetch(`/api/admin/roles/${roleId}/permissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setSelectedPermissions(data.data.map((p: Permission) => p.id));
      }
    } catch (err) {
      console.error('Error fetching role permissions:', err);
    }
  };

  const handleOpen = (role?: Role) => {
    if (role) {
      setEditing(role);
      setFormData({
        name: role.name,
        code: role.code,
        description: role.description || '',
        isActive: role.isActive,
      });
    } else {
      setEditing(null);
      setFormData({ name: '', code: '', description: '', isActive: true });
    }
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const handlePermOpen = async (role: Role) => {
    setSelectedRole(role);
    await fetchRolePermissions(role.id);
    setPermOpen(true);
  };

  const handlePermClose = () => {
    setPermOpen(false);
    setSelectedRole(null);
    setSelectedPermissions([]);
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    try {
      const url = editing ? `/api/admin/roles/${editing.id}` : '/api/admin/roles';
      const method = editing ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchRoles();
        setSuccess(editing ? 'Cập nhật vai trò thành công' : 'Tạo vai trò thành công');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc muốn xóa vai trò này?')) return;

    try {
      const response = await fetch(`/api/admin/roles/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchRoles();
        setSuccess('Xóa vai trò thành công');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Có lỗi xảy ra');
        setTimeout(() => setError(''), 3000);
      }
    } catch (err) {
      setError('Có lỗi xảy ra');
    }
  };

  const handlePermissionToggle = (permId: number) => {
    setSelectedPermissions(prev =>
      prev.includes(permId)
        ? prev.filter(id => id !== permId)
        : [...prev, permId]
    );
  };

  const handleModuleToggle = (module: string, checked: boolean) => {
    const modulePerms = permissions[module]?.map(p => p.id) || [];
    if (checked) {
      setSelectedPermissions(prev => {
        const combined = [...prev, ...modulePerms];
        return combined.filter((id, index) => combined.indexOf(id) === index);
      });
    } else {
      setSelectedPermissions(prev => prev.filter(id => !modulePerms.includes(id)));
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/roles/${selectedRole.id}/permissions`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissionIds: selectedPermissions }),
      });
      const data = await response.json();
      if (data.success) {
        handlePermClose();
        setSuccess('Cập nhật quyền thành công');
        setTimeout(() => setSuccess(''), 3000);
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (isLoading || !isAuthenticated) {
    return null;
  }

  return (
    <Layout>
      <Box>
        {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Quản lý Vai trò</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Thêm vai trò
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã</TableCell>
                <TableCell>Tên</TableCell>
                <TableCell>Mô tả</TableCell>
                <TableCell>Hệ thống</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {roles.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Chưa có dữ liệu vai trò
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                roles.map((role) => (
                  <TableRow key={role.id}>
                    <TableCell>
                      <Chip label={role.code} size="small" color="primary" variant="outlined" />
                    </TableCell>
                    <TableCell>{role.name}</TableCell>
                    <TableCell>{role.description || '-'}</TableCell>
                    <TableCell>
                      {role.isSystem ? (
                        <Chip label="Hệ thống" size="small" color="warning" />
                      ) : (
                        <Chip label="Tùy chỉnh" size="small" />
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip
                        label={role.isActive ? 'Hoạt động' : 'Vô hiệu'}
                        size="small"
                        color={role.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handlePermOpen(role)} title="Phân quyền">
                        <SecurityIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleOpen(role)} title="Sửa">
                        <EditIcon />
                      </IconButton>
                      {!role.isSystem && (
                        <IconButton size="small" onClick={() => handleDelete(role.id)} title="Xóa">
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>

        {/* Dialog thêm/sửa vai trò */}
        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Sửa vai trò' : 'Thêm vai trò mới'}</DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            <TextField
              autoFocus
              margin="dense"
              label="Tên vai trò"
              fullWidth
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            />
            <TextField
              margin="dense"
              label="Mã vai trò"
              fullWidth
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value.toLowerCase().replace(/[^a-z_]/g, '') })}
              disabled={editing?.isSystem}
              helperText="Chỉ chứa chữ thường và dấu gạch dưới"
            />
            <TextField
              margin="dense"
              label="Mô tả"
              fullWidth
              multiline
              rows={2}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
            <FormControlLabel
              control={
                <Switch
                  checked={formData.isActive}
                  onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                />
              }
              label="Hoạt động"
              sx={{ mt: 1 }}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Dialog phân quyền */}
        <Dialog open={permOpen} onClose={handlePermClose} maxWidth="md" fullWidth>
          <DialogTitle>Phân quyền cho: {selectedRole?.name}</DialogTitle>
          <DialogContent dividers>
            {Object.entries(permissions).map(([module, perms]) => {
              const modulePermIds = perms.map(p => p.id);
              const allSelected = modulePermIds.every(id => selectedPermissions.includes(id));
              const someSelected = modulePermIds.some(id => selectedPermissions.includes(id));

              return (
                <Accordion key={module} defaultExpanded>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Checkbox
                      checked={allSelected}
                      indeterminate={someSelected && !allSelected}
                      onChange={(e) => handleModuleToggle(module, e.target.checked)}
                      onClick={(e) => e.stopPropagation()}
                    />
                    <Typography sx={{ fontWeight: 'bold', textTransform: 'capitalize' }}>
                      {module}
                    </Typography>
                    <Chip
                      label={`${modulePermIds.filter(id => selectedPermissions.includes(id)).length}/${perms.length}`}
                      size="small"
                      sx={{ ml: 1 }}
                    />
                  </AccordionSummary>
                  <AccordionDetails>
                    <FormGroup row>
                      {perms.map((perm) => (
                        <FormControlLabel
                          key={perm.id}
                          control={
                            <Checkbox
                              checked={selectedPermissions.includes(perm.id)}
                              onChange={() => handlePermissionToggle(perm.id)}
                            />
                          }
                          label={
                            <Box>
                              <Typography variant="body2">{perm.name}</Typography>
                              <Typography variant="caption" color="text.secondary">
                                {perm.code}
                              </Typography>
                            </Box>
                          }
                          sx={{ width: '48%', mb: 1 }}
                        />
                      ))}
                    </FormGroup>
                  </AccordionDetails>
                </Accordion>
              );
            })}
          </DialogContent>
          <DialogActions>
            <Button onClick={handlePermClose}>Hủy</Button>
            <Button onClick={handleSavePermissions} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu quyền'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

