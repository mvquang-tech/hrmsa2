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
  Chip,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonAddIcon from '@mui/icons-material/PersonAdd';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';

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
  hasAccount?: boolean;
}

export default function EmployeesPage() {
  const { isAuthenticated, token, isLoading, hasPermission } = useAuth();
  
  // Check permissions from RBAC
  const canCreate = hasPermission('employees.create');
  const canUpdate = hasPermission('employees.update');
  const canDelete = hasPermission('employees.delete');
  const canCreateAccount = hasPermission('employees.create_account');
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
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  
  // Account creation dialog
  const [accountOpen, setAccountOpen] = useState(false);
  const [selectedEmployee, setSelectedEmployee] = useState<Employee | null>(null);
  const [accountForm, setAccountForm] = useState({ username: '', password: '' });

  useEffect(() => {
    if (isLoading) return;
    
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    
    if (token) {
      fetchEmployees();
      fetchDepartments();
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

  // Account management
  const handleAccountOpen = async (emp: Employee) => {
    setSelectedEmployee(emp);
    setAccountForm({
      username: emp.code.toLowerCase(),
      password: '',
    });
    setAccountOpen(true);
    setError('');

    // Check if already has account
    try {
      const response = await fetch(`/api/employees/${emp.id}/account`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await response.json();
      if (data.success && data.data.hasAccount) {
        setError(`Nhân viên đã có tài khoản: ${data.data.account.username}`);
      }
    } catch (err) {
      console.error('Error checking account:', err);
    }
  };

  const handleAccountClose = () => {
    setAccountOpen(false);
    setSelectedEmployee(null);
    setAccountForm({ username: '', password: '' });
    setError('');
  };

  const handleCreateAccount = async () => {
    if (!selectedEmployee) return;
    if (!accountForm.username || !accountForm.password) {
      setError('Vui lòng nhập đầy đủ thông tin');
      return;
    }
    if (accountForm.password.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(`/api/employees/${selectedEmployee.id}/account`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(accountForm),
      });
      const data = await response.json();
      if (data.success) {
        handleAccountClose();
        setSuccess(`Tạo tài khoản thành công cho ${selectedEmployee.firstName} ${selectedEmployee.lastName}`);
        setTimeout(() => setSuccess(''), 5000);
        fetchEmployees();
      } else {
        setError(data.error || 'Có lỗi xảy ra');
      }
    } catch (err) {
      setError('Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) return null;

  return (
    <Layout>
      <Box>
        {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}
        
        <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
          <Typography variant="h4">Nhân sự</Typography>
          {canCreate && (
            <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()}>
              Thêm nhân viên
            </Button>
          )}
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
                <TableCell>Tài khoản</TableCell>
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
                    <TableCell>
                      <Chip 
                        label={emp.status === 'active' ? 'Hoạt động' : emp.status === 'inactive' ? 'Tạm nghỉ' : 'Đã nghỉ'}
                        size="small"
                        color={emp.status === 'active' ? 'success' : emp.status === 'inactive' ? 'warning' : 'default'}
                      />
                    </TableCell>
                    <TableCell>
                      {emp.hasAccount ? (
                        <Chip 
                          icon={<CheckCircleIcon />}
                          label="Đã có"
                          size="small"
                          color="success"
                          variant="outlined"
                        />
                      ) : canCreateAccount ? (
                        <Tooltip title="Cấp tài khoản">
                          <IconButton 
                            size="small" 
                            color="primary"
                            onClick={() => handleAccountOpen(emp)}
                          >
                            <PersonAddIcon />
                          </IconButton>
                        </Tooltip>
                      ) : (
                        <Chip label="Chưa có" size="small" variant="outlined" />
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {canUpdate && (
                        <IconButton size="small" onClick={() => handleOpen(emp)}>
                          <EditIcon />
                        </IconButton>
                      )}
                      {canDelete && (
                        <IconButton size="small" onClick={() => handleDelete(emp.id)}>
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

        {/* Dialog cấp tài khoản */}
        <Dialog open={accountOpen} onClose={handleAccountClose} maxWidth="sm" fullWidth>
          <DialogTitle>
            Cấp tài khoản đăng nhập
          </DialogTitle>
          <DialogContent>
            {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
            {selectedEmployee && (
              <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.100', borderRadius: 1 }}>
                <Typography variant="subtitle2" color="text.secondary">Nhân viên</Typography>
                <Typography variant="body1" fontWeight="medium">
                  {selectedEmployee.firstName} {selectedEmployee.lastName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedEmployee.email}
                </Typography>
              </Box>
            )}
            <TextField
              autoFocus
              margin="dense"
              label="Tên đăng nhập"
              fullWidth
              value={accountForm.username}
              onChange={(e) => setAccountForm({ ...accountForm, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
              helperText="Chỉ chứa chữ thường, số và dấu gạch dưới"
            />
            <TextField
              margin="dense"
              label="Mật khẩu"
              type="password"
              fullWidth
              value={accountForm.password}
              onChange={(e) => setAccountForm({ ...accountForm, password: e.target.value })}
              helperText="Tối thiểu 6 ký tự"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleAccountClose}>Hủy</Button>
            <Button onClick={handleCreateAccount} variant="contained" disabled={loading}>
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Layout>
  );
}

