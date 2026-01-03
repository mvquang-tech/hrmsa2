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

interface Leave {
  id: number;
  employeeId: number;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: string;
}

export default function LeavesPage() {
  const { isAuthenticated, token, user, isLoading, hasPermission } = useAuth();
  const router = useRouter();
  const [leaves, setLeaves] = useState<Leave[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Leave | null>(null);
  const [formData, setFormData] = useState({
    employeeId: '',
    type: 'annual',
    startDate: '',
    endDate: '',
    reason: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Check permissions from RBAC
  const canCreate = hasPermission('leaves.create');
  const canUpdate = hasPermission('leaves.update');
  const canDelete = hasPermission('leaves.delete');
  const canApprove = hasPermission('leaves.approve');

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchLeaves();
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

  const fetchLeaves = async () => {
    if (!token) {
      console.error('No token available');
      return;
    }
    try {
      const response = await fetch('/api/leaves', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        setLeaves(data.data.data);
      } else {
        console.error('Failed to fetch leaves:', data.error);
        if (data.error === 'Unauthorized') {
          router.push('/login');
        }
      }
    } catch (err) {
      console.error('Error fetching leaves:', err);
    }
  };

  const handleOpen = (leave?: Leave) => {
    if (leave && leave.status === 'pending') {
      setEditing(leave);
      setFormData({
        employeeId: leave.employeeId.toString(),
        type: leave.type,
        startDate: leave.startDate.split('T')[0],
        endDate: leave.endDate.split('T')[0],
        reason: leave.reason,
      });
    } else {
      setEditing(null);
      setFormData({
        employeeId: user?.employeeId?.toString() || '',
        type: 'annual',
        startDate: '',
        endDate: '',
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
      const url = editing ? `/api/leaves/${editing.id}` : '/api/leaves';
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
        }),
      });
      const data = await response.json();
      if (data.success) {
        handleClose();
        fetchLeaves();
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
      const response = await fetch(`/api/leaves/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status }),
      });
      const data = await response.json();
      if (data.success) {
        fetchLeaves();
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
      const response = await fetch(`/api/leaves/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success) {
        fetchLeaves();
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

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      annual: 'Phép năm',
      sick: 'Ốm đau',
      personal: 'Việc riêng',
      maternity: 'Thai sản',
      unpaid: 'Không lương',
    };
    return labels[type] || type;
  };

  if (!isAuthenticated) return null;

  // Check if user can edit/delete specific leave request
  const canEditItem = (leave: Leave) => {
    // User can edit their own pending requests, or if they have update permission
    if (leave.employeeId === user?.employeeId && leave.status === 'pending') {
      return true;
    }
    return canUpdate;
  };

  const canDeleteItem = (leave: Leave) => {
    // User can delete their own pending requests, or if they have delete permission
    if (leave.employeeId === user?.employeeId && leave.status === 'pending') {
      return true;
    }
    return canDelete;
  };

  return (
    <Layout>
      <Box>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Nghỉ phép</Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Tạo đơn nghỉ phép
            </Button>
          )}
        </Box>

        <TableContainer component={Paper}>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>Nhân viên</TableCell>
                <TableCell>Loại</TableCell>
                <TableCell>Từ ngày</TableCell>
                <TableCell>Đến ngày</TableCell>
                <TableCell>Số ngày</TableCell>
                <TableCell>Lý do</TableCell>
                <TableCell>Trạng thái</TableCell>
                <TableCell align="right">Thao tác</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {leaves.map((leave) => {
                const emp = employees.find((e) => e.id === leave.employeeId);
                const empName = emp ? `${emp.firstName} ${emp.lastName}` : `ID: ${leave.employeeId}`;
                return (
                  <TableRow key={leave.id}>
                    <TableCell>{empName}</TableCell>
                    <TableCell>{getTypeLabel(leave.type)}</TableCell>
                    <TableCell>{new Date(leave.startDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{new Date(leave.endDate).toLocaleDateString('vi-VN')}</TableCell>
                    <TableCell>{leave.days}</TableCell>
                    <TableCell>{leave.reason}</TableCell>
                    <TableCell>
                      <Chip
                        label={getStatusLabel(leave.status)}
                        color={getStatusColor(leave.status) as any}
                        size="small"
                      />
                    </TableCell>
                    <TableCell align="right">
                      {canEditItem(leave) && (
                        <IconButton size="small" onClick={() => handleOpen(leave)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canApprove && leave.status === 'pending' && (
                        <>
                          <Button
                            size="small"
                            color="success"
                            onClick={() => handleApprove(leave.id, 'approved')}
                          >
                            Duyệt
                          </Button>
                          <Button
                            size="small"
                            color="error"
                            onClick={() => handleApprove(leave.id, 'rejected')}
                          >
                            Từ chối
                          </Button>
                        </>
                      )}
                      {canDeleteItem(leave) && (
                        <IconButton size="small" onClick={() => handleDelete(leave.id)}>
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
          <DialogTitle>{editing ? 'Sửa đơn nghỉ phép' : 'Tạo đơn nghỉ phép'}</DialogTitle>
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
              select
              label="Loại nghỉ phép"
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              margin="normal"
              required
            >
              <MenuItem value="annual">Phép năm</MenuItem>
              <MenuItem value="sick">Ốm đau</MenuItem>
              <MenuItem value="personal">Việc riêng</MenuItem>
              <MenuItem value="maternity">Thai sản</MenuItem>
              <MenuItem value="unpaid">Không lương</MenuItem>
            </TextField>
            <TextField
              fullWidth
              label="Từ ngày"
              type="date"
              value={formData.startDate}
              onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
            />
            <TextField
              fullWidth
              label="Đến ngày"
              type="date"
              value={formData.endDate}
              onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
              margin="normal"
              InputLabelProps={{ shrink: true }}
              required
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

