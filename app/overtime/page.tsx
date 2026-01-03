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
  MenuItem,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { UserRole } from '@/lib/types';

interface Employee {
  id: number;
  code: string;
  firstName: string;
  lastName: string;
}

interface Overtime {
  id: number;
  employeeId: number;
  date: string;
  hours: number;
  reason: string;
  status: string;
}

export default function OvertimePage() {
  const { isAuthenticated, token, user, isLoading } = useAuth();
  const router = useRouter();
  const [overtimes, setOvertimes] = useState<Overtime[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Overtime | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    date: '',
    hours: '',
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchOvertimes();
      if (user?.role !== UserRole.EMPLOYEE) {
        fetchEmployees();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated, token, isLoading, router, user]);

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

  const fetchOvertimes = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/overtime', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setOvertimes(data.data.data);
      } else {
        console.error('Failed to fetch overtimes:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching overtimes:', err);
    }
  };

  const handleOpen = (ot?: Overtime) => {
    if (ot && ot.status === 'pending') {
      setEditing(ot);
      setFormData({
        employeeId: ot.employeeId.toString(),
        date: ot.date.split('T')[0],
        hours: ot.hours.toString(),
        reason: ot.reason,
      });
    } else {
      setEditing(null);
      setFormData({
        employeeId: user?.employeeId?.toString() || '',
        date: '',
        hours: '',
        reason: '',
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
      const url = editing ? `/api/overtime/${editing.id}` : '/api/overtime';
      const method = editing ? 'PUT' : 'POST';
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          ...formData,
          employeeId: parseInt(formData.employeeId),
          hours: parseFloat(formData.hours),
        }),
      });
      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchOvertimes();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: number, status: 'approved' | 'rejected') => {
    try {
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchOvertimes();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Bạn có chắc chắn muốn xóa đơn này?')) return;
    try {
      const response = await fetch(`/api/overtime/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchOvertimes();
      } else {
        alert(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      alert('Có lỗi xảy ra');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'success';
      case 'rejected':
        return 'error';
      default:
        return 'warning';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'approved':
        return 'Đã duyệt';
      case 'rejected':
        return 'Từ chối';
      default:
        return 'Chờ duyệt';
    }
  };

  if (!isAuthenticated) return null;

  const canEdit = (ot: Overtime) => {
    if (user?.role === UserRole.EMPLOYEE) {
      return ot.status === 'pending' && ot.employeeId === user.employeeId;
    }
    return true;
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Ngoài giờ</Typography>
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
            Tạo đơn ngoài giờ
          </Button>
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nhân viên</TableCell>
                <TableCell>Ngày</TableCell>
                <TableCell>Số giờ</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {overtimes.map((ot) => {
                const emp = employees.find((e) => e.id === ot.employeeId);
                const empName = emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${ot.employeeId}`;
                return (
                  <TableRow key={ot.id}>
                    <TableCell>{empName}</TableCell>
                    <TableCell>{new Date(ot.date).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{ot.hours}</TableCell>
                    <TableCell>{ot.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(ot.status)}
                        color={getStatusColor(ot.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEdit(ot) && (
                        <IconButton size="small" onClick={() => handleOpen(ot)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {user?.role !== UserRole.EMPLOYEE && ot.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleApprove(ot.id, 'approved')}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleApprove(ot.id, 'rejected')}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {canEdit(ot) && (
                        <IconButton size="small" onClick={() => handleDelete(ot.id)}>
                          <DeleteIcon />
                        </IconButton>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>

        <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            {editing ? 'Sửa đơn ngoài giờ' : 'Tạo đơn ngoài giờ'}
          </DialogTitle>
          <DialogContent>
            {error && (
              <Alert severity="error" sx={{ mb: 2 }}>
                {error}
              </Alert>
            )}
            {user?.role !== UserRole.EMPLOYEE && (
              <TextField
                fullWidth
                select
                label="Nhân viên"
                value={formData.employeeId}
                onChange={(e) => setFormData({ ...formData, employeeId: e.target.value })}
                margin="normal"
                required
              >
                {employees.map((emp) => (
                  <MenuItem key={emp.id} value={emp.id}>
                    {`${emp.firstName} ${emp.lastName} (${emp.code})`}
                  </MenuItem>
                ))}
              </TextField>
            )}
            <TextField
              fullWidth
              label="Ngày"
              type="date"
              value={formData.date}
              onChange={(e) => setFormData({ ...formData, date: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Số giờ"
              type="number"
              value={formData.hours}
              onChange={(e) => setFormData({ ...formData, hours: e.target.value })}
              margin="normal"
              required
              inputProps={{ min: 0.5, step: 0.5 }}
            />
            <TextField
              fullWidth
              label="Lý do"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              margin="normal"
              multiline
              rows={3}
              required
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

