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
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

interface Department {
  id: number;
  name: string;
  code: string;
}

interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  dateOfJoin: string;
  departmentId: number;
  position?: string;
  status: string;
}

export default function EmployeesPage() {
  const { isAuthenticated, token } = useAuth();
  const router = useRouter();
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [formData, setFormData] = useState({
    code: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    dateOfJoin: '',
    departmentId: '',
    position: '',
    status: 'active',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!isAuthenticated || !token) {
      if (!isAuthenticated) {
        router.push('/login');
      }
      return;
    }
    fetchEmployees();
    fetchDepartments();
  }, [isAuthenticated, token, router]);

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
      if (data.success) {
        setDepartments(data.data.data);
      } else {
        console.error('Failed to fetch departments:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching departments:', err);
    }
  };

  const fetchEmployees = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/employees', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setEmployees(data.data.data);
      } else {
        console.error('Failed to fetch employees:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching employees:', err);
    }
  };

  const handleOpen = (emp?: Employee) => {
    if (emp) {
      setEditing(emp);
      setFormData({
        code: emp.code,
        firstName: emp.firstName,
        lastName: emp.lastName,
        email: emp.email,
        phone: emp.phone || '',
        dateOfJoin: emp.dateOfJoin.split('T')[0],
        departmentId: emp.departmentId.toString(),
        position: emp.position || '',
        status: emp.status,
      });
    } else {
      setEditing(null);
      setFormData({
        code: '',
        firstName: '',
        lastName: '',
        email: '',
        phone: '',
        dateOfJoin: '',
        departmentId: '',
        position: '',
        status: 'active',
      });
    }
    setOpen(true);
    setError('');
  };

  const handleClose = () => {
    setOpen(false);
    setEditing(null);
    setError('');
  };

  const handleSubmit = async () => {
    setError('');
    setLoading(true);
    try {
      const url = editing ? `/api/employees/${editing.id}` : '/api/employees';
      const method = editing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          departmentId: parseInt(formData.departmentId),
        }),
      });
      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchEmployees();
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
    if (!confirm('Bạn có chắc chắn muốn xóa nhân viên này?')) return;
    try {
      const response = await fetch(`/api/employees/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchEmployees();
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
          <Typography variant="h4">Nhân sự</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Thêm nhân viên
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Mã</TableCell>
                <TableCell>Họ tên</TableCell>
                <TableCell>Email</TableCell>
                <TableCell>Phòng ban</TableCell>
                <TableCell>Chức vụ</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {employees.map((emp) => {
                const dept = departments.find((d) => d.id === emp.departmentId);
                return (
                  <TableRow key={emp.id}>
                    <TableCell>{emp.code}</TableCell>
                    <TableCell>{`${emp.firstName} ${emp.lastName}`}</TableCell>
                    <TableCell>{emp.email}</TableCell>
                    <TableCell>{dept?.name || '-'}</TableCell>
                    <TableCell>{emp.position || '-'}</TableCell>
                    <TableCell>{emp.status}</TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => handleOpen(emp)}>
                        <EditIcon />
                      </IconButton>
                      <IconButton size="small" onClick={() => handleDelete(emp.id)}>
                        <DeleteIcon />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="md" fullWidth>
          <DialogTitle>{editing ? 'Sửa nhân viên' : 'Thêm nhân viên'}</DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 1 }}>
              <TextField
                fullWidth
                label="Mã nhân viên"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Họ"
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Tên"
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                required
              />
              <TextField
                fullWidth
                label="Số điện thoại"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
              <TextField
                fullWidth
                label="Ngày vào làm"
                type="date"
                value={formData.dateOfJoin}
                onChange={(e) => setFormData({ ...formData, dateOfJoin: e.target.value })}
                InputLabelProps={{ shrink: true }}
                required
              />
              <TextField
                fullWidth
                select
                label="Phòng ban"
                value={formData.departmentId}
                onChange={(e) => setFormData({ ...formData, departmentId: e.target.value })}
                required
              >
                {departments.map((dept) => (
                  <MenuItem key={dept.id} value={dept.id}>
                    {dept.name}
                  </MenuItem>
                ))}
              </TextField>
              <TextField
                fullWidth
                label="Chức vụ"
                value={formData.position}
                onChange={(e) => setFormData({ ...formData, position: e.target.value })}
              />
              <TextField
                fullWidth
                select
                label="Trạng thái"
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              >
                <MenuItem value="active">Hoạt động</MenuItem>
                <MenuItem value="inactive">Không hoạt động</MenuItem>
                <MenuItem value="terminated">Đã nghỉ việc</MenuItem>
              </TextField>
            </Box>
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

