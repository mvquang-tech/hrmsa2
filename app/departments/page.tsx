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
} from '@mui/material';
import Autocomplete from '@mui/material/Autocomplete';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Department {
  id: number;
  name: string;
  code: string;
  description?: string;
  managerId?: number;
  managers?: Array<{ id: number; firstName: string; lastName: string; code?: string }>;
}

export default function DepartmentsPage() {
  const { isAuthenticated, token, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Department | null>(null);
  const [employees, setEmployees] = useState<any[]>([]);
  const [employeesLoading, setEmployeesLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', code: '', description: '', managerIds: [] as number[] });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check permissions from RBAC
  const canCreate = hasPermission('departments.create');
  const canUpdate = hasPermission('departments.update');
  const canDelete = hasPermission('departments.delete');

  useEffect(() => {
    // Wait for auth loading to complete
    if (isLoading) return;
    
    // Redirect to login if not authenticated
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    // Fetch data if authenticated
    if (token) {
      fetchDepartments();
      fetchEmployees();
    }
  }, [isAuthenticated, token, isLoading, router]);

  const fetchDepartments = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/departments', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      console.log('Departments API response:', data);
      if (data.success && data.data) {
        // API returns { success: true, data: { data: [...], total: ..., page: ... } }
        // Check if data.data exists (paginated response) or data is array directly
        const departmentsList = Array.isArray(data.data.data) 
          ? data.data.data 
          : (Array.isArray(data.data) ? data.data : []);
        console.log('Departments list:', departmentsList, 'Count:', departmentsList.length);
        setDepartments(departmentsList);
      } else {
        console.error('Failed to fetch departments:', data.error || 'Unknown error');
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchEmployees = async () => {
    if (!token) return;
    setEmployeesLoading(true);
    try {
      // fetch many employees for manager selection
      const response = await fetch('/api/employees/list?limit=1000', { headers: { Authorization: `Bearer ${token}` } });
      const data = await response.json();
      console.log('fetchEmployees response:', data);
      if (data.success && data.data && Array.isArray(data.data.data)) {
        setEmployees(data.data.data);
        console.log('Loaded employees count:', data.data.data.length);
      } else if (data.success && Array.isArray(data.data)) {
        setEmployees(data.data);
        console.log('Loaded employees count:', data.data.length);
      } else {
        console.warn('No employees data in response');
        setEmployees([]);
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
      setEmployees([]);
    } finally {
      setEmployeesLoading(false);
    }
  };


  const handleOpen = (dept?: Department) => {
    if (dept) {
      setEditing(dept);
      setFormData({
        name: dept.name,
        code: dept.code,
        description: dept.description || '',
        managerIds: (dept.managers || []).map(m => m.id),
      });
    } else {
      setEditing(null);
      setFormData({ name: '', code: '', description: '', managerIds: [] });
    }
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setFormData({ name: '', code: '', description: '', managerIds: [] });
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const url = editing ? `/api/departments/${editing.id}` : '/api/departments';
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
        fetchDepartments();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa phòng ban này?')) return;
    try {
      const response = await fetch(`/api/departments/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchDepartments();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Phòng ban</Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Thêm phòng ban
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
                    <TableHead>
              <TableRow>
                <TableCell>Mã</TableCell>
                <TableCell>Tên</TableCell>
                <TableCell>Người quản lý</TableCell>
                <TableCell>Mô tả</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {departments.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} align="center">
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      Chưa có dữ liệu phòng ban
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                departments.map((dept) => (
                  <TableRow key={dept.id}>
                    <TableCell>{dept.code}</TableCell>
                    <TableCell>{dept.name}</TableCell>
                    <TableCell>{(dept.managers || []).length === 0 ? '-' : (dept.managers || []).map(m => `${m.firstName} ${m.lastName}`).join(', ')}</TableCell>
                    <TableCell>{dept.description || '-'}</TableCell>
                    <TableCell align="right">
                      {canUpdate && (
                        <IconButton size="small" onClick={() => handleOpen(dept)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton size="small" onClick={() => handleDelete(dept.id)}>
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

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>{editing ? 'Sửa phòng ban' : 'Thêm phòng ban'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <TextField
              fullWidth
              label="Mã phòng ban"
              value={formData.code}
              onChange={(e) => setFormData({ ...formData, code: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Tên phòng ban"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              margin="normal"
              required
            />
            <TextField
              fullWidth
              label="Mô tả"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              margin="normal"
              multiline
              rows={3}
            />

            <Autocomplete
              multiple
              options={employees}
              loading={employeesLoading}
              loadingText="Đang tải..."
              noOptionsText="Không có dữ liệu"
              getOptionLabel={(opt: any) => `${opt.firstName || ''} ${opt.lastName || ''} (${opt.code || ''})`}
              isOptionEqualToValue={(option: any, value: any) => Number(option.id) === Number(value.id)}
              value={employees.filter(e => (formData.managerIds || []).includes(Number(e.id)))}
              onChange={(event, value) => setFormData({ ...formData, managerIds: value.map((v: any) => Number(v.id)) })}
              renderTags={(value: any[], getTagProps) =>
                value.map((option: any, index: number) => (
                  <Chip label={`${option.firstName || ''} ${option.lastName || ''}`} {...getTagProps({ index })} key={option.id} />
                ))
              }
              renderInput={(params) => (
                <TextField
                  {...params}
                  label="Người quản lý"
                  placeholder="Chọn người quản lý"
                  margin="normal"
                />
              )}
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Hủy</Button>
            <Button onClick={handleSubmit} variant="contained" disabled={loading}>
              {loading ? 'Đang lưu...' : 'Lưu'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

